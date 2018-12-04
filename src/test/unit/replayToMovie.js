const Stream = require('stream');
const crypto = require('crypto');
const tape = require('tape');

const P5 = require('@code-dot-org/p5');

const danceParty = require('../../danceParty');
const replay = require('../fixtures/replay.json');
const { renderImages } = require('../../replayToMovie');

const BG_EFFECTS = [
  null,
  "circles",
  "color_cycle",
  "diamonds",
  "disco_ball",
  "fireworks",
  "swirl",
  "kaleidoscope",
  "lasers",
  "splatter",
  "rainbow",
  "smile_face",
  "snowflakes",
  "galaxy",
  "sparkles",
  "spiral",
  "disco",
  "stars",
];

const PALETTE_NAMES = [
  null,
  "rave",
  "cool",
  "electronic",
  "iceCream",
  "default",
  "neon",
  "tropical",
  "vintage",
  "warm",
];

const FG_EFFECTS = [
  null,
  "bubbles",
  "confetti",
  "hearts_red",
  "music_notes",
  "pineapples",
  "pizzas",
  "smiling_poop",
  "rain",
  "floating_rainbows",
  "smile_face",
  "spotlight",
  "color_lights",
  "raining_tacos",
];

const generateFrames = (override = {}) => {
  return new Array(20).fill(null).map((_, i) => Object.assign({
    context: {
      backgroundColor: "#fff",
      isPeak: true,
      centroid: 0,
      bpm: 133,
      artist: "artist",
      title: "title"
    },
    bg: null,
    fg: null,
    sprites: [{
      "animationFrame": i % danceParty.constants.FRAMES,
      "animationLabel": "anim0",
      "mirrorX": -1,
      "rotation": i,
      "scale": 1,
      "style": "ROBOT",
      "visible": true,
      "height": 300,
      "width": 300,
      "x": 150,
      "y": 150
    }]
  }, override));
};

const createWritableStreamTest = (subTest) => {
  subTest.plan(1);
  const writableStream = new Stream;
  writableStream.writable = true;

  let lastBuffer;
  let allDifferent = true;

  writableStream.write = function (newBuffer) {
    if (lastBuffer && newBuffer.equals(lastBuffer)) {
      allDifferent = false;
    }
    lastBuffer = newBuffer;
  };

  writableStream.end = function (newBuffer) {
    if (arguments.length) {
      writableStream.write(newBuffer);
    }
    writableStream.writable = false;

    subTest.equal(allDifferent, true, "canvas updated on every frame");
  };

  return writableStream;
};


tape('background effects can all be consumed without breaking canvas in all palette combinations', (t) => {
  t.plan(BG_EFFECTS.length * PALETTE_NAMES.length);

  BG_EFFECTS.forEach((bg) => {
    PALETTE_NAMES.forEach((palette) => {
      t.test(`${bg} (${palette})`, (st) => {

        const replay = generateFrames({
          bg,
          palette
        });

        const writableStream = createWritableStreamTest(st);

        renderImages(replay, writableStream);
      });
    });
  });
});

tape('foreground effects can all be consumed without breaking canvas', (t) => {
  t.plan(FG_EFFECTS.length);

  FG_EFFECTS.forEach((effect) => {
    t.test(effect, (st) => {

      const replay = generateFrames({
        fg: effect
      });

      const writableStream = createWritableStreamTest(st);

      renderImages(replay, writableStream);
    });
  });
});

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
