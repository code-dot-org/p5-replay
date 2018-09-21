const fs = require('fs');
const { runTestExport } = require('./replayToMovie');
const uuidv4 = require('uuid/v4');

const BUCKET = process.env.DESTINATION_BUCKET;
const UPLOAD_KEY = 'videos';

async function renderVideo(replay, callback) {
  try {
    const uuid = uuidv4();
    const outputPath = '/tmp/video-' + uuid + '.mp4';
    await runTestExport(outputPath, replay);

    console.log("Export complete, uploading");
    await uploadFolder(BUCKET, UPLOAD_KEY, '/tmp/');

    const fileStats = fs.statSync(outputPath);
    fs.unlinkSync(outputPath); // Delete file when done

    console.log("Upload complete, returning response");
    responseBody = JSON.stringify({
      path: outputPath,
      stats: fileStats, // TODO: probably don't need to return this to the client, may want to check size somewhere though
      s3Path: 'http://s3.amazonaws.com/' + BUCKET + '/' + UPLOAD_KEY + '/video-' + uuid + '.mp4'
    });
    const response = {
      statusCode: 200,
      body: responseBody,
    };
    callback(null, response);
  } catch (error) {
    const response = {
      statusCode: 500,
      body: JSON.stringify(error),
    };
    callback(null, response);
  }
}

module.exports.render = async (event, context, callback) => {
  const replayJSON = event.body;
  const replay = JSON.parse(replayJSON);
  await renderVideo(replay, callback);
};

// TODO: module.exports.renderFromS3, and set up Serverless handler
const renderFromS3 = async (event, context, callback) => {
  const srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  const replayJSON = await download(srcBucket, srcKey);
  const replay = JSON.parse(replayJSON);
  await renderVideo(replay, callback);
};

module.exports.runTest = async (event, context, callback) => {
  const replay = require('./test/fixtures/replay.json');
  await renderVideo(replay, callback);
};

// S3 functions modified from https://github.com/kvaggelakos/serverless-ffmpeg
const AWS = require('aws-sdk');
const { join, basename } = require('path');
const s3 = new AWS.S3();

function upload(Bucket, Key, Body, ContentEncoding, ContentType) {
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
        console.log("Uploading file to " + file);
        return upload(bucket, `${key}/${file}`, fs.createReadStream(join(folder, file), contentEncoding, contentType));
      })
    ).then(resolve).catch(reject);
  })
}

function download(Bucket, Key) {
  console.log(`Downloading file: ${Key} from bucket: ${Bucket}`);

  return new Promise((resolve, reject) => {
    const destPath = join(tmpdir(), basename(Key));
    const file = createWriteStream(destPath);
    file.on('close', () => resolve(destPath));
    file.on('error', reject);

    s3.getObject({Bucket, Key})
      .on('error', reject)
      .createReadStream()
      .pipe(file);
  });
}
