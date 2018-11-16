/* eslint-disable no-console */

process.env.AWS_SAM_LOCAL = true;
const {runTestExport} = require('../replayToMovie');
const uuidv4 = require('uuid/v4');

(async function() {
  const uuid = uuidv4();
  const outputPath = '/tmp/video-' + uuid + '.mp4';
  const replay = require('./fixtures/replay.json');
  await runTestExport(outputPath, replay);
  console.log(`Video saved to ${outputPath}`);
})();
