const fs = require('fs');
const { runTestExport } = require('./replayToMovie');
const uuidv4 = require('uuid/v4');

const BUCKET = process.env.DESTINATION_BUCKET;
const UPLOAD_KEY = 'videos';

module.exports.runTest = async (event, context, callback) => {
  const uuid = uuidv4();
  const outputPath = '/tmp/video-' + uuid + '.mp4';
  await runTestExport(outputPath);
  console.log("Export complete, uploading");
  await uploadFolder(BUCKET, UPLOAD_KEY, '/tmp/');
  console.log("Upload complete, returning response");
  responseBody = JSON.stringify({
    path: outputPath,
    stats: fs.statSync(outputPath),
    s3Path: 'http://s3.amazonaws.com/' + BUCKET + '/' + UPLOAD_KEY + '/video-' + uuid + '.mp4'
  });
  fs.unlinkSync(outputPath);
  const response = {
    statusCode: 200,
    body: responseBody
  };
  callback(null, response);
};

// S3 uploads modified from https://github.com/kvaggelakos/serverless-ffmpeg
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
