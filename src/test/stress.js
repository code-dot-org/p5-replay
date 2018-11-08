const request = require('request');
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');

const replay = require('./fixtures/replay.json');

const s3 = new AWS.S3();
const SOURCE_BUCKET = process.env.SOURCE_BUCKET || 'cdo-p5-replay-source-staging';
const BUCKET = process.env.DESTINATION_BUCKET;
const SOURCE_KEY = 'source';
const DEST_KEY = 'videos';

let i = 0;
setInterval(() => {
  i++;
  if (i % 100 == 0) {
    console.log(i);
  }
  const uuid = uuidv4();
  const expirationInSeconds = 60 * 10;
  const url = s3.getSignedUrl('putObject', {
    Bucket: SOURCE_BUCKET,
    Key: `${SOURCE_KEY}/${uuid}`,
    Expires: expirationInSeconds
  });

  request({
    url,
    method: 'PUT',
    body: JSON.stringify(replay)
  }, function (error, response, body) {
  });
}, 100);
