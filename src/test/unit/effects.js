const Stream = require('stream');
const tape = require('tape');

const { constants } = require('../../danceParty');
const { renderImages } = require('../../replayToMovie');

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
      "animationFrame": i % constants.FRAMES,
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
  const palettes = Object.keys(constants.PALETTES);
  t.plan(constants.BACKGROUND_EFFECTS.length * palettes.length);

  constants.BACKGROUND_EFFECTS.forEach((bg) => {
    palettes.forEach((palette) => {
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
  t.plan(constants.FOREGROUND_EFFECTS.length);

  constants.FOREGROUND_EFFECTS.forEach((effect) => {
    t.test(effect, (st) => {

      const replay = generateFrames({
        fg: effect
      });

      const writableStream = createWritableStreamTest(st);

      renderImages(replay, writableStream);
    });
  });
});
