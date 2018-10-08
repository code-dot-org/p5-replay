const fs = require('fs');
const { runTestExport } = require('./replayToMovie');
const uuidv4 = require('uuid/v4');
const {tmpdir} = require('os');

const BUCKET = process.env.DESTINATION_BUCKET;
const LOCAL = process.env.AWS_SAM_LOCAL;
const UPLOAD_KEY = 'videos';

function debug(str) {
  if (LOCAL) {
    console.log(str);
  }
}

async function renderVideo(replay, callback) {
  try {
    const uuid = uuidv4();
    const outputPath = '/tmp/video-' + uuid + '.mp4';
    await runTestExport(outputPath, replay);

    debug("Export complete, uploading");
    await uploadFolder(BUCKET, UPLOAD_KEY, '/tmp/');

    const fileStats = fs.statSync(outputPath);
    fs.unlinkSync(outputPath); // Delete file when done

    debug("Upload complete, returning response");
    const responseBody = JSON.stringify({
      path: outputPath,
      stats: fileStats, // TODO: probably don't need to return this to the client, may want to check size somewhere though
      s3Path: 'http://s3.amazonaws.com/' + BUCKET + '/' + UPLOAD_KEY + '/video-' + uuid + '.mp4'
    });
    callback(null, {
      statusCode: 200,
      body: responseBody
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
  await renderVideo(replay, callback);
};

module.exports.renderFromS3 = async (event, context, callback) => {
  const srcBucket = event.Records[0].s3.bucket.name;
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  const tmpPath = await download_and_return_tmp_path(srcBucket, srcKey);
  const replayJSON = fs.readFileSync(tmpPath);
  fs.unlinkSync(tmpPath);
  const replay = JSON.parse(replayJSON);
  await renderVideo(replay, callback);
};

module.exports.runTest = async (event, context, callback) => {
  const replay = require('./test/fixtures/replay.json');
  await renderVideo(replay, callback);
};

// S3 functions modified from https://github.com/kvaggelakos/serverless-ffmpeg
// noinspection NpmUsedModulesInstalled
const AWS = require('aws-sdk');
const { join, basename } = require('path');
const s3 = new AWS.S3();

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

function uploadFolder(bucket, key, folder, contentEncoding, contentType) {
  return new Promise((resolve, reject) => {
    const files = fs.readdirSync(folder);
    Promise.all(
      files.map((file) => {
        debug("Uploading file to " + file);
        return upload(bucket, `${key}/${file}`, fs.createReadStream(join(folder, file)), contentEncoding, contentType);
      })
    ).then(resolve).catch(reject);
  })
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
