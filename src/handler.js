const fs = require('fs');
const uuidv4 = require('uuid/v4');
const {tmpdir} = require('os');
const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk-core');
const { join, basename } = require('path');

const s3 = new AWS.S3();

const { runTestExport } = require('./replayToMovie');
const { debug } = require('./utils');

const BUCKET = process.env.DESTINATION_BUCKET;
const SOURCE_BUCKET = process.env.SOURCE_BUCKET;
const LOCAL = process.env.AWS_SAM_LOCAL;
const SOURCE_KEY = 'source';
const DEST_KEY = 'videos';
const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

AWSXRay.enableManualMode();

function getOutputURL(uuid) {
  return `/${DEST_KEY}/video-${uuid}.mp4`;
}

async function renderVideo(replay, callback, segment, forceUUID = null) {
  try {
    const uuid = forceUUID || uuidv4();
    segment.addMetadata('uuid', uuid);
    const outputFile = `video-${uuid}.mp4`;
    const outputPath = `/tmp/${outputFile}`;
    await runTestExport(outputPath, replay, segment);

    debug("Export complete, uploading");
    await uploadFile(BUCKET, `${DEST_KEY}/${outputFile}`, outputPath);

    const fileStats = fs.statSync(outputPath);
    fs.unlinkSync(outputPath); // Delete file when done

    debug("Upload complete, returning response");
    const responseBody = JSON.stringify({
      path: outputPath,
      stats: fileStats, // TODO: probably don't need to return this to the client, may want to check size somewhere though
      s3Path: getOutputURL(uuid)
    });
    callback(null, {
      statusCode: 200,
      body: responseBody,
      headers: HEADERS
    });
  } catch (error) {
    segment.addError(error);
    callback(null, {
      statusCode: 500,
      body: JSON.stringify(error)
    });
  } finally {
    segment.close();
  }
}

module.exports.render = async (event, context, callback) => {
  const segment = new AWSXRay.Segment('render');
  const replayJSON = event.body;
  const replay = JSON.parse(replayJSON);
  if (replay.log && replay.id) {
    await renderVideo(replay.log, callback, segment, replay.id);
  } else {
    await renderVideo(replay, callback, segment);
  }
};

module.exports.renderFromS3 = async (event, context, callback) => {
  const segment = new AWSXRay.Segment('renderFromS3');
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  const tmpPath = await download_and_return_tmp_path(srcBucket, srcKey);
  const replayJSON = fs.readFileSync(tmpPath);
  fs.unlinkSync(tmpPath);
  let replay = [];
  try {
    replay = JSON.parse(replayJSON);
  } catch (err) {
    segment.addError(err);
    // eslint-disable-next-line no-console
    debug(err);
  }

  await renderVideo(replay, callback, segment, srcKey.replace(`${SOURCE_KEY}/`, ''));
};

/**
 * Returns a URL to upload an animation JSON file to via a PUT request
 */
module.exports.getS3UploadURL = async (event, context, callback) => {
  const uuid = uuidv4();
  const expirationInSeconds = 60 * 10;
  const url = s3.getSignedUrl('putObject', {
    Bucket: SOURCE_BUCKET,
    Key: `${SOURCE_KEY}/${uuid}`,
    Expires: expirationInSeconds
  });
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      uploadURL: url,
      resultLocation: getOutputURL(uuid)
    }),
    headers: HEADERS
  };
  callback(null, response);
};

module.exports.runTest = async (event, context, callback) => {
  const segment = new AWSXRay.Segment('runTest');
  const replay = require('./test/fixtures/replay.json');
  await renderVideo(replay, callback, segment);
};

// S3 functions modified from https://github.com/kvaggelakos/serverless-ffmpeg
function upload(Bucket, Key, Body, ContentEncoding, ContentType) {
  if (LOCAL) {
    return Promise.resolve();
  }
  return s3.putObject({
    Bucket: Bucket,
    Key: Key,
    Body: Body,
    ContentEncoding: ContentEncoding,
    ContentType: ContentType
  }).promise();
}

function uploadFile(bucket, key, file, contentEncoding, contentType) {
  debug(`Uploading local file at ${file} to ${key} in ${bucket}`);
  return upload(bucket, key, fs.createReadStream(file), contentEncoding, contentType);
}

function download_and_return_tmp_path(Bucket, Key) {
  debug(`Downloading file: ${Key} from bucket: ${Bucket}`);

  return new Promise((resolve, reject) => {
    const destPath = join(tmpdir(), basename(Key));
    const file = fs.createWriteStream(destPath);
    file.on('close', () => resolve(destPath));
    file.on('error', reject);

    if (LOCAL) {
      const replay = JSON.stringify(require('./test/fixtures/replay.json'));
      file.write(replay);
      file.end();
    } else {
      s3.getObject({Bucket, Key})
        .on('error', reject)
        .createReadStream()
        .pipe(file);
    }
  });
}
