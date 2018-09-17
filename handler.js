// const { getFileInformation, download, uploadFolder, deleteObject } = require('./src/s3');
// const { getDestinationBucket, getFfmpegParameters } = require('./src/env');
// const { ffprobe, ffmpeg } = require('./src/ffmpeg');
// const { createReadStream } = require('fs');

// module.exports.main = async (event, context, callback) => {
//   const {eventName, bucket, key} = getFileInformation(event);
//
//   console.log(`Received ${eventName} for item in bucket: ${bucket}, key: ${key}`);
//
//   try {
//     const destPath = await download(bucket, key);
//     await ffprobe(destPath);
//     const outputPath = await ffmpeg(destPath, 'm3u', getFfmpegParameters());
//     await uploadFolder(getDestinationBucket(), key, outputPath);
//   } catch (error) {
//     callback(error);
//   }
// };

// const canvas = require("canvas");
const { runTestExport } = require('./replayToMovie');
module.exports.runTest = async (event, context, callback) => {
  await runTestExport(callback);
  const response = {
    statusCode: 200,
    body: "Finished"
  };
  callback(null, response);
  // console.log("test");
  // console.log(canvas);
};
