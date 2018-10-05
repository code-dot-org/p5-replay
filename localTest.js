const {runTestExport} = require('./replayToMovie');
const replay = require('./test/fixtures/replay.json');

process.stdout._handle.setBlocking(true);
runTestExport(replay, process.stdout);
