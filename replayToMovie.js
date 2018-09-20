const Stream = require('stream');
const spawn = require('child_process').spawn;
const Canvas = require('canvas');
const streamifier = require('streamifier');

const FFMPEG_PATH = (process.platform === "darwin") ? "/usr/local/bin/ffmpeg" : "binaries/ffmpeg/ffmpeg";

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

module.exports.runTestExport = async (outputPath) => {
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
  const child = spawn(FFMPEG_PATH,
    [
      '-i', 'pipe:',
      outputPath,
      '-pix_fmt', 'yuv420p',
      '-framerate', '30',
      '-movflags', 'faststart',
      '-crf', '18',
      '-threads', '4',
    ]
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

  async function generateFrame(n) {
    const entry = replay[n];
    if (entry) {
      for (let [spriteName, modifiers] of Object.entries(entry)) {
        if (!sprites[spriteName]) { // lazy create sprites
          const sprite = p5Inst.createSprite();
          sprite.addAnimation('default', anim);
          sprites[spriteName] = sprite;
        }
        for (let [prop, value] of Object.entries(modifiers)) {
          if (prop === 'x' || prop === 'y') {
            sprites[spriteName].position[prop] = value;
          } else {
            sprites[spriteName][prop] = value;
          }
        }
      }

      p5Inst.background('#fff');
      p5Inst.drawSprites();
    }

    return await new Promise((resolve, reject) => {
      // Write an image.
      const imageStream = canvas.createJPEGStream();
      imageStream.on('error', reject);
      imageStream.on('data', chunk => {
        toEncode.emit('data', chunk)
      });
      imageStream.on('end', resolve);
    });
  }

  async function generateVideo() {
    for (let i = 0; i < replay.length; i++) {
      if (i % 100 === 0) {
        console.log('Generating frame ' + i);
      }
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
    child.on('exit', function(val) {
      console.log('Encoding complete with return value ' + val);
      val === 0 ? resolve() : reject();
    });
  });

  for (const [key, sprite] of Object.entries(sprites)) {
    sprite.remove();
  }
};

