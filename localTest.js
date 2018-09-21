const fs = require('fs');
const { runTestExport } = require('./replayToMovie');
const uuidv4 = require('uuid/v4');


(async function() {
  const uuid = uuidv4();
  const outputPath = '/tmp/video-' + uuid + '.mp4';
  await runTestExport(outputPath);
  console.log(`Video saved to ${outputPath}`)
})();
