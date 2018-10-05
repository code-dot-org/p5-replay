const spawn = require('child_process').spawn;
const Canvas = require('canvas');

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

const WIDTH = 400;
const HEIGHT = 400;

module.exports.runTestExport = (replay, writer) => {
// Create our emulated canvas.
  const canvas = Canvas.createCanvas(WIDTH, HEIGHT);
  canvas.style = {};
  p5Inst._renderer = new p5.Renderer2D(canvas, p5Inst, false);
  p5Inst._renderer.resize(WIDTH, HEIGHT);

  // TODO: look up sprites/animations from in-memory cache
  const anim = p5Inst.loadAnimation('./test/fixtures/sprite.png');
  const sprites = {}; // lazily initialized when used
  function generateFrame(n) {
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

    // Write an image.
    writer.write(canvas.toBuffer('raw'));
  }

  function generateVideo() {
    for (let i = 0; i < replay.length; i++) {
      if (i % 100 === 0) {
        // console.error('Generating frame ' + i);
      }
      generateFrame(i);
    }
  }

  generateVideo();

  for (const [key, sprite] of Object.entries(sprites)) {
    sprite.remove();
  }
  console.error('finished');
};

module.exports.renderVideo = (input, outputFile) => {
  // Spawn the ffmpeg process.
  let args = [
    '-f', 'image2pipe',
    '-r', '30',
    '-c:v', 'rawvideo',
    '-pix_fmt', 'argb',
    '-s', `${WIDTH}x${HEIGHT}`,
    '-frame_size', (WIDTH * HEIGHT * 4),
    '-i', 'pipe:0',
    '-crf', '18',
    '-movflags', 'faststart',
    '-f', 'mp4',
    '-y',
    outputFile
  ];
  let options = {
    stdio: [input, 'inherit', 'inherit']
  };
  console.log(`${FFMPEG_PATH} ${args.join(' ')}`);
  const child = spawn(FFMPEG_PATH, args, options);
  return new Promise((resolve, reject) => {
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
};
