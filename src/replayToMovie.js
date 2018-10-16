const spawn = require('child_process').spawn;
const os = require('os');
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
  getElementsByTagName: () => [],
  createElement: type => {
    if (type !== 'canvas') {
      throw new Error('Cannot create type.');
    }
    const created = Canvas.createCanvas();
    created.style = {};
    return created;
  }
};
window.screen = {};
window.addEventListener = () => {};
window.Image = Canvas.Image;
window.ImageData = Canvas.ImageData;

// Initialize p5
// sprite and move values copied from cdo/apps/src/dance/p5.dance.js
// TODO elijah: find a less-fragile way to manage this shared data
const SPRITE_NAMES = ["ALIEN", "BEAR", "CAT", "DOG", "DUCK", "FROG", "MOOSE", "PINEAPPLE", "ROBOT", "SHARK", "UNICORN"];
const MOVE_NAMES = ["Rest", "ClapHigh", "Clown", "Dab", "DoubleJam", "Drop", "Floss", "Fresh", "Kick", "Roll", "ThisOrThat", "Thriller"];

const IMAGE_BASE = "./images/";
const ANIMATIONS = {};
const WIDTH = 400;
const HEIGHT = 400;

const p5 = require('./node_modules/@code-dot-org/p5.play/p5.js');
require('./node_modules/@code-dot-org/p5.play/lib/p5.play.js');
const p5Inst = new p5(function (p5obj) {
  p5obj._fixedSpriteAnimationFrameSizes = true;
});

// Create our emulated canvas.
const canvas = window.document.createElement('canvas');
p5Inst._renderer = new p5.Renderer2D(canvas, p5Inst, false);
p5Inst._renderer.resize(WIDTH, HEIGHT);

function loadNewSpriteSheet(urlOrPath) {
  return new Promise(function (resolve, reject) {
    p5Inst.loadImage(urlOrPath, resolve, reject);
  }).then(function (image) {
    return p5Inst.loadSpriteSheet(image, 300, 300, 24);
  });
}

async function loadSprite(spriteName) {
  if (ANIMATIONS[spriteName]) {
    return;
  }

  debug(`loading animations for ${spriteName}`);
  ANIMATIONS[spriteName] = [];
  for (let j = 0; j < MOVE_NAMES.length; j++) {
    const moveName = MOVE_NAMES[j];
    const file = IMAGE_BASE + spriteName + "_" + moveName + ".png";
    const spriteSheet = await loadNewSpriteSheet(file);
    ANIMATIONS[spriteName].push(p5Inst.loadAnimation(spriteSheet))
  }
}

function debug(str) {
  if (LOCAL) {
    console.log(str);
  }
}

module.exports.runTestExport = async (outputPath, replay) => {
  let [pipe, promise] = module.exports.renderVideo(outputPath);
  pipe._handle.setBlocking(true);
  await module.exports.renderImages(replay, pipe);
  await promise.catch(err => {
    console.error(err);
    process.exit(1);
  });
};

module.exports.renderImages = async (replay, writer) => {
  const sprites = [];
  for (const frame of replay) {
    for (let i = 0; i < frame.length; i++) {
      const entry = frame[i];

      if (!sprites[i]) {
        sprites[i] = p5Inst.createSprite();
        await loadSprite(entry.style);
        ANIMATIONS[entry.style].forEach(function (animation, j) {
          sprites[i].addAnimation("anim" + j, animation);
        });
      }

      const sprite = sprites[i];

      sprite.changeAnimation(entry.animationLabel);
      sprite.mirrorX(entry.mirrorX);
      sprite.rotation = entry.rotation;
      sprite.scale = entry.scale;
      // Ignoring tint for now; it causees perf issues
      //sprite.tint = entry.tint === undefined ? undefined : "hsb(" + (Math.round(entry.tint) % 360) + ", 100%, 100%)";
      sprite.setFrame(entry.animationFrame);
      sprite.x = entry.x;
      sprite.y = entry.y;
    }

    p5Inst.background('#fff');
    p5Inst.drawSprites();
    // Write an image.
    writer.write(canvas.toBuffer('raw'));
  }

  sprites.forEach(sprite => sprite.remove());
  writer.end();
  debug('finished');
};

module.exports.renderVideo = (outputFile) => {
  // Spawn the ffmpeg process.
  let args = [
    '-f', 'rawvideo',
    '-r', '30',
    '-pix_fmt', (os.endianness() === 'LE' ? 'bgra' : 'argb'),
    '-s', `${WIDTH}x${HEIGHT}`,
    '-frame_size', (WIDTH * HEIGHT * 4),
    '-i', 'pipe:0',
    '-f', 'mp4',
    // https://trac.ffmpeg.org/wiki/Encode/H.264#crf
    '-crf', CRF.toString(),
    // https://trac.ffmpeg.org/wiki/Encode/H.264#faststartforwebvideo
    '-movflags', 'faststart',
    // https://trac.ffmpeg.org/wiki/Encode/H.264#Preset
    '-preset', 'ultrafast',
    // https://trac.ffmpeg.org/wiki/Encode/H.264#Tune
    '-tune', 'zerolatency',
    // https://trac.ffmpeg.org/wiki/Encode/H.264#Alldevices
    '-profile:v', 'baseline',
    '-level', '3.0',
    // https://trac.ffmpeg.org/wiki/Encode/H.264#Encodingfordumbplayers
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
