const Canvas = require('canvas');
const fs = require('fs');
const os = require('os');
const request = require("request")
const spawn = require('child_process').spawn;

const FFMPEG_PATH = "binaries/ffmpeg/ffmpeg";
const LOCAL = process.env.AWS_SAM_LOCAL;
const CRF = process.env.QUALITY || 23;

// Allow binaries to run out of the bundle
process.env['PATH'] += ':' + process.env['LAMBDA_TASK_ROOT'];

const SPRITE_S3_BASE = "http://s3.amazonaws.com/cdo-curriculum/images/sprites/spritesheet_tp/"
const SPRITE_BASE = "./sprites/";
const ANIMATIONS = {};
const WIDTH = 400;
const HEIGHT = 400;

// Allow binaries to run out of the bundle
process.env['PATH'] += ':' + process.env['LAMBDA_TASK_ROOT'];

// Mock the browser environment for p5.
// Note: must be done before requiring danceParty
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
window.removeEventListener = () => {};
window.Image = Canvas.Image;
window.ImageData = Canvas.ImageData;

const danceParty = require('@code-dot-org/dance-party');

const Effects = danceParty.Effects;
const SPRITE_NAMES = danceParty.constants.SPRITE_NAMES;
const MOVE_NAMES = danceParty.constants.MOVE_NAMES;

const P5 = require('@code-dot-org/p5');
P5.disableFriendlyErrors = true;

require('@code-dot-org/p5.play/lib/p5.play');

const p5Inst = new P5(function (p5obj) {
  p5obj._fixedSpriteAnimationFrameSizes = true;
});

// Create our emulated canvas.
const canvas = window.document.createElement('canvas');
p5Inst._renderer = new P5.Renderer2D(canvas, p5Inst, false);
p5Inst._renderer.resize(WIDTH, HEIGHT);

const backgroundEffects = new Effects(p5Inst, 1);
const foregroundEffects = new Effects(p5Inst, 0.8);

function loadNewSpriteSheet(spriteName, moveName) {
  debug(`loading ${spriteName}@${moveName}`);

  const image = new Promise((resolve, reject) => {
    const localFile = SPRITE_BASE + spriteName + "_" + moveName + ".png";
    p5Inst.loadImage(localFile, resolve, () => {
      debug(`could not file ${spriteName}@${moveName} image locally, loading from S3`);
      const s3File = SPRITE_S3_BASE + spriteName + "_" + moveName + ".png";
      p5Inst.loadImage(s3File, resolve, reject);
    });
  });

  const jsonData = new Promise((resolve, reject) => {
    const localFile = SPRITE_BASE + spriteName + "_" + moveName + ".json";
    fs.readFile(SPRITE_BASE + spriteName + "_" + moveName + ".json", (err, data) => {  
      if (err) {
      debug(`could not file ${spriteName}@${moveName} json locally, loading from S3`);
        const s3File = SPRITE_S3_BASE + spriteName + "_" + moveName + ".json";
        request({
          url: s3File,
          json: true
        }, (error, response, body) => {
          if (!error && response.statusCode === 200) {
            resolve(body);
          } else {
            reject(error);
          }
        });
      } else {
        resolve(JSON.parse(data));
      }
    });
  });

  return Promise.all([image, jsonData]).then(([image, jsonData]) => {
    // from https://github.com/code-dot-org/dance-party/blob/763de665816848b81f93f7e194d9ae0a35f5d1b7/src/p5.dance.js#L175-L178:
    // Passing true as the 3rd arg to loadSpriteSheet() indicates that we want
    // it to load the image as a Image (instead of a p5.Image), which avoids
    // a canvas creation. This makes it possible to run on mobile Safari in
    // iOS 12 with canvas memory limits.
    // TODO elijah: see if this makes a perf difference on labmda, either way
    return p5Inst.loadSpriteSheet(
      image,
      jsonData.frames,
      true
    );
  });
}

async function loadSprite(spriteName) {
  if (ANIMATIONS[spriteName]) {
    return;
  }

  debug(`loading animations for ${spriteName}`);
  ANIMATIONS[spriteName] = [];
  for (let j = 0; j < MOVE_NAMES.length; j++) {
    const moveName = MOVE_NAMES[j].name;
    const spriteSheet = await loadNewSpriteSheet(spriteName, moveName);
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
    // temporarily support both the new version of replay logs that contain
    // sprites as well as envrionmental data, and the old version that contains
    // just sprites
    const onlySprites = !frame.sprites;

    // Load sprites and set state
    const frameSprites = onlySprites ? frame : frame.sprites;
    for (let i = 0; i < frameSprites.length; i++) {
      const entry = frameSprites[i];

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

    // Draw frame
    if (onlySprites) {
      p5Inst.background('#fff');
      p5Inst.drawSprites();
    } else {
      backgroundEffects[frame.bg || 'none'].draw(frame.context);
      p5Inst.drawSprites();
      if (frame.fg) {
        p5Inst.push();
        p5Inst.blendMode(foregroundEffects.blend);
        backgroundEffects[frame.fg].draw(frame.context);
        p5Inst.pop();
      }
    }

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
