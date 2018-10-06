const spawn = require('child_process').spawn;
const Canvas = require('canvas');

const FFMPEG_PATH = "binaries/ffmpeg/ffmpeg";
const LOCAL = process.env.AWS_SAM_LOCAL;
const CRF = process.env.QUALITY || 23;

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

function debug(str) {
  if (LOCAL) {
    console.log(str);
  }
}

module.exports.runTestExport = async (outputPath, replay) => {
  let [pipe, promise] = module.exports.renderVideo(outputPath);
  pipe._handle.setBlocking(true);
  module.exports.renderImages(replay, pipe);
  await promise.catch(err => {
    console.error(err);
    process.exit(1);
  });
};

module.exports.renderImages = (replay, writer) => {
// Create our emulated canvas.
  const canvas = Canvas.createCanvas(WIDTH, HEIGHT);
  canvas.style = {};
  p5Inst._renderer = new p5.Renderer2D(canvas, p5Inst, false);
  p5Inst._renderer.resize(WIDTH, HEIGHT);

  // TODO: look up sprites/animations from in-memory cache
  const anim = p5Inst.loadAnimation('./test/fixtures/sprite.png');
  const sprites = {}; // lazily initialized when used

  replay.forEach(entry => {
    Object.entries(entry).forEach(([spriteName, modifiers]) => {
      if (!sprites[spriteName]) { // lazy create sprites
        const sprite = p5Inst.createSprite();
        sprite.addAnimation('default', anim);
        sprites[spriteName] = sprite;
      }
      Object.entries(modifiers).forEach(([prop, value]) => {
        if (prop === 'x' || prop === 'y') {
          sprites[spriteName].position[prop] = value;
        } else {
          sprites[spriteName][prop] = value;
        }
      });
    });
    p5Inst.background('#fff');
    p5Inst.drawSprites();
    // Write an image.
    writer.write(canvas.toBuffer('raw'));
  });

  Object.values(sprites).forEach(sprite => sprite.remove());
  writer.end();
  console.error('finished');
};

module.exports.renderVideo = (outputFile) => {
  // Spawn the ffmpeg process.
  let args = [
    '-f', 'rawvideo',
    '-r', '30',
    '-pix_fmt', 'argb',
    '-s', `${WIDTH}x${HEIGHT}`,
    '-frame_size', (WIDTH * HEIGHT * 4),
    '-i', 'pipe:0',
    '-crf', CRF.toString(),
    '-movflags', 'faststart',
    '-f', 'mp4',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-profile:v', 'baseline',
    '-level', '3.0',
    '-pix_fmt', 'yuv420p',
    '-y',
    outputFile
  ];
  const stdout = LOCAL ? 'inherit' : 'ignore';
  let options = {
    stdio: ['pipe', stdout, stdout]
  };
  debug(`${FFMPEG_PATH} ${args.join(' ')}`);
  const child = spawn(FFMPEG_PATH, args, options);
  const promise = new Promise((resolve, reject) => {
    debug('Waiting for ffmpeg to encode');
    child.on('error', function(err) {
      console.error('Error during encoding: ' + err);
      reject();
    });
    child.on('exit', function(val) {
      debug('Encoding complete with return value ' + val);
      val === 0 ? resolve() : reject();
    });
  });
  return [child.stdin, promise];
};
