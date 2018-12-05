const Stream = require('stream');
const crypto = require('crypto');
const tape = require('tape');

const replay = require('../fixtures/replay.json');
const { renderImages } = require('../../replayToMovie');

const P5 = require('@code-dot-org/p5');

tape('replay log consistently renders to the same thing', (t) => {
  t.plan(1);

  // Seed p5 so randomized effects behave consistently
  const p5Inst = new P5();
  p5Inst.randomSeed(12345);

  // Dump the output of renderImages directly to a hash
  const writableStream = new Stream;
  writableStream.writable = true;
  const hash = crypto.createHash('sha1');
  hash.setEncoding('hex');
  writableStream.pipe(hash);
  writableStream.write = function (newBuffer) {
    hash.write(newBuffer);
  };

  writableStream.end = function (newBuffer) {
    if (arguments.length) {
      writableStream.write(newBuffer);
    }

    hash.end();
    const shaSum = hash.read();
    t.equals(shaSum, "6241d37ce069ec97aef2c694f6885b83c7167b4f");
  };

  renderImages(replay, writableStream);
});
