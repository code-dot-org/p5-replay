const fs = require('fs');
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');

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


function getOutputURL(uuid) {
  return `/${DEST_KEY}/video-${uuid}.mp4`;
}

async function renderVideo(replay, callback, forceUUID = null) {
  try {
    const uuid = forceUUID || uuidv4();
    const outputFile = `video-${uuid}.mp4`;
    const outputPath = `/tmp/${outputFile}`;
    await runTestExport(outputPath, replay);

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
    callback(null, {
      statusCode: 500,
      body: JSON.stringify(error)
    });
  }
}

module.exports.render = async (event, context, callback) => {
  const replayJSON = event.body;
  const replay = JSON.parse(replayJSON);
  if (replay.log && replay.id) {
    await renderVideo(replay.log, callback, replay.id);
  } else {
    await renderVideo(replay, callback);
  }
};

module.exports.renderFromS3 = async (event, context, callback) => {
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  const replay = await getJSONFromS3(srcBucket, srcKey);
  await renderVideo(replay, callback, srcKey.replace(`${SOURCE_KEY}/`, ''));
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
  const replay = require('./test/fixtures/replay.json');
  await renderVideo(replay, callback);
};

// S3 functions modified from https://github.com/kvaggelakos/serverless-ffmpeg
function upload(Bucket, Key, Body, ContentEncoding, ContentType) {
  if (LOCAL) {
    return Promise.resolve();
  }
  return s3.putObject({
    Bucket,
    Key,
    Body,
    ContentEncoding,
    ContentType
  }).promise();
}

function uploadFile(bucket, key, file, contentEncoding, contentType) {
  debug(`Uploading local file at ${file} to ${key} in ${bucket}`);
  return upload(bucket, key, fs.createReadStream(file), contentEncoding, contentType);
}

async function getJSONFromS3(bucket, key) {
  debug(`Downloading file: ${key} from bucket: ${bucket}`);

  if (LOCAL) {
    debug("skipping download for local process");
    return require('./test/fixtures/replay.json');
  }

  const result = await s3.getObject({bucket, key}).promise();
  try {
    return JSON.parse(result);
  } catch (err) {
    if (err instanceof SyntaxError) {
      // eslint-disable-next-line no-console
      console.error(`Could not parse file: ${key} from bucket: ${bucket}`);
      return [];
    } else {
      throw err;
    }
  }
}
