const Stream = require('stream');
const spawn = require('child_process').spawn;
const Canvas = require('canvas');

// Allow binaries to run out of the bundle
process.env['PATH'] += ':' + process.env['LAMBDA_TASK_ROOT'];

// Mock the browser environment for p5.
global.window = global;
window.performance = {now: Date.now};
window.document = {
  hasFocus: () => {
  },
  createElement: type => {
    if (type !== 'canvas') {
      throw new Error('Cannot create type.');
    }
    return Canvas.createCanvas();
  }
};
window.screen = {};
window.addEventListener = () => {
};
window.Image = Canvas.Image;
window.ImageData = Canvas.ImageData;
const p5 = require('./node_modules/p5');
require('./node_modules/p5/lib/addons/p5.play');
const p5Inst = new p5();

function loadReplay() {
  return require('./test/fixtures/replay.json');
}

module.exports.runTestExport = async (callback, outputPath) => {
  const WIDTH = 400;
  const HEIGHT = 400;

// Create our emulated canvas.
  const canvas = Canvas.createCanvas(WIDTH, HEIGHT);
  canvas.style = {};
  p5Inst._renderer = new p5.Renderer2D(canvas, p5Inst, false);
  p5Inst._renderer.resize(WIDTH, HEIGHT);

// Spawn the ffmpeg process.
  const toEncode = new Stream();
  toEncode.writable = true;
  toEncode.readable = true;
  const child = spawn("binaries/ffmpeg/ffmpeg",
    ['-r', '30', '-i', 'pipe:', '-movflags', 'faststart', '-crf', '18', '-pix_fmt', 'yuv420p', outputPath]
  );
  // child.stdout.pipe(process.stdout);
  // child.stderr.pipe(process.stdout);
  toEncode.pipe(child.stdin);

  function finishVideo() {
    console.log('Finishing video');
    toEncode.emit('end');
  }

  const anim = p5Inst.loadAnimation('./test/fixtures/sprite.png');
  const replay = loadReplay();

  const sprites = {};
  const spriteIndices = new Set();
  for (let i = 0; i < replay.length; ++i) {
    const entry = replay[i];
    if (entry) {
      for (let [n, modifiers] of Object.entries(entry)) {
        spriteIndices.add(n);
      }
    }
  }

  for (let n of spriteIndices) {
    const sprite = p5Inst.createSprite();
    sprite.addAnimation('default', anim);
    sprites[n] = sprite;
  }

  async function generateFrame(n) {
    const entry = replay[n];
    if (entry) {
      for (let [n, modifiers] of Object.entries(entry)) {
        for (let [prop, value] of Object.entries(modifiers)) {
          if (prop === 'x' || prop === 'y') {
            sprites[n].position[prop] = value;
          } else {
            sprites[n][prop] = value;
          }
        }
      }

      p5Inst.background('#fff');
      p5Inst.drawSprites();
    }

    return await new Promise((resolve, reject) => {
      // Write an image.
      const jpegStream = canvas.jpegStream();
      jpegStream.on('error', reject);
      jpegStream.on('data', chunk => toEncode.emit('data', chunk));
      jpegStream.on('end', resolve);
    });
  }

  async function generateVideo() {
    for (let i = 0; i < replay.length; i++) {
      console.log('Generating frame ' + i);
      await generateFrame(i);
    }
  }

  await generateVideo().then(finishVideo);
  console.log('Video generation complete');
  await new Promise((resolve, reject) => {
    console.log('Waiting for ffmpeg to encode');
    child.on('error', function(err) {
      console.log('Error during encoding: ' + err);
      reject();
    });
    child.on('exit', function() {
      console.log('Encoding complete');
      resolve();
    });
  });
};

