const AWSXRay = require('aws-xray-sdk-core');
const Canvas = require('canvas');
const fs = require('fs');
const os = require('os');
const request = require("request");
const spawn = require('child_process').spawn;

const { debug } = require('./utils');

const FFMPEG_PATH = "binaries/ffmpeg/ffmpeg";
const LOCAL = process.env.AWS_SAM_LOCAL;
const CRF = process.env.QUALITY || 23;

const FRAME_LIMIT = 30 * 10; // 10 seconds @ 30 fps
const SPRITE_LIMIT = 25;

// Allow binaries to run out of the bundle
process.env['PATH'] += ':' + process.env['LAMBDA_TASK_ROOT'];

const SPRITE_S3_BASE = "http://s3.amazonaws.com/cdo-curriculum/images/sprites/spritesheet_tp2/";
const SPRITE_BASE = "./sprites/";
const ANIMATIONS = {};
const WIDTH = 400;
const HEIGHT = 400;

// Some effects don't currently work, and should be skipped
const BROKEN_FOREGROUND_EFFECTS = [
  "hearts_red",
  "music_notes",
  "pineapples",
  "pizzas",
  "floating_rainbows",
  "smiling_poop",
  "raining_tacos",
  "smile_face",
];
const BROKEN_BACKGROUND_EFFECTS = [
  'fireworks',
  "kaleidoscope",
];

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
const MOVE_NAMES = danceParty.constants.MOVE_NAMES;

const P5 = require('@code-dot-org/p5');
P5.disableFriendlyErrors = true;

require('@code-dot-org/p5.play/lib/p5.play');

const p5Inst = new P5(function (p5obj) {
  p5obj._fixedSpriteAnimationFrameSizes = true;
  p5obj.width = WIDTH;
  p5obj.height = HEIGHT;
});

function loadNewSpriteSheet(spriteName, moveName) {
  debug(`loading ${spriteName}@${moveName}`);

  const image = new Promise((resolve, reject) => {
    const localFile = SPRITE_BASE + spriteName + "_" + moveName + ".png";
    p5Inst.loadImage(localFile, resolve, () => {
      debug(`could not find ${spriteName}@${moveName} image locally, loading from S3`);
      const s3File = SPRITE_S3_BASE + spriteName + "_" + moveName + ".png";
      p5Inst.loadImage(s3File, resolve, reject);
    });
  });

  const jsonData = new Promise((resolve, reject) => {
    const localFile = SPRITE_BASE + spriteName + "_" + moveName + ".json";
    fs.readFile(localFile, (err, data) => {
      if (err) {
        debug(`could not find ${spriteName}@${moveName} json locally, loading from S3`);
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
    ANIMATIONS[spriteName].push(p5Inst.loadAnimation(spriteSheet));
  }
}

module.exports.runTestExport = async (outputPath, replay, parentSegment = new AWSXRay.Segment('runExportStandalone')) => {
  const exportSegment = new AWSXRay.Segment('runExport', parentSegment.trace_id, parentSegment.id);
  let [pipe, promise] = module.exports.renderVideo(outputPath, exportSegment);
  pipe._handle.setBlocking(true);
  await module.exports.renderImages(replay, pipe, exportSegment);
  await promise.catch(err => {
    exportSegment.addError(err);
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
  exportSegment.close();
};

module.exports.renderImages = async (replay, writer, parentSegment) => {
  const renderSegment = new AWSXRay.Segment('renderImages', parentSegment.trace_id, parentSegment.id);
  const sprites = [];
  let lastBackground;
  let lastForeground;

  // Create our emulated canvas.
  // We have to create a new canvas on every request, otherwise under periods
  // of high traffic the canvas can get into a state where it "freezes" and
  // repeats a single frame for the length of an entire video.
  // See https://github.com/code-dot-org/dance-party/issues/514 for more context
  const canvas = window.document.createElement('canvas');
  p5Inst._renderer = new P5.Renderer2D(canvas, p5Inst, false);
  p5Inst._renderer.resize(WIDTH, HEIGHT);

  const backgroundEffects = new Effects(p5Inst, 1);
  const foregroundEffects = new Effects(p5Inst, 0.8);

  replay.length = Math.min(replay.length, FRAME_LIMIT);

  for (const frame of replay) {
    // Load sprites and set state
    frame.sprites.length = Math.min(frame.sprites.length, SPRITE_LIMIT);
    for (let i = 0; i < frame.sprites.length; i++) {
      const entry = frame.sprites[i];

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
      sprite.height = entry.height;
      sprite.width = entry.width;
      sprite.visible = entry.visible;
    }

    // Draw frame
    p5Inst.background('#fff');

    if (frame.palette) {
      backgroundEffects.currentPalette = frame.palette;
    }

    if (!BROKEN_BACKGROUND_EFFECTS.includes(frame.bg)) {
      const effect = backgroundEffects[frame.bg] || backgroundEffects.none;
      try {
        if (lastBackground != frame.bg && effect.init) {
          effect.init();
        }
        lastBackground = frame.bg;
        effect.draw(frame.context);
      } catch (err) {
        renderSegment.addError(err);
      }
    }

    p5Inst.drawSprites();

    if (frame.fg && !BROKEN_FOREGROUND_EFFECTS.includes(frame.fg)) {
      p5Inst.push();
      p5Inst.blendMode(foregroundEffects.blend);
      try {
        const effect = foregroundEffects[frame.fg] || foregroundEffects.none;
        if (lastForeground != frame.fg && effect.init) {
          effect.init();
        }
        lastForeground = frame.fg;
        effect.draw(frame.context);
      } catch (err) {
        renderSegment.addError(err);
      }
      p5Inst.pop();
    }

    // Write an image.
    writer.write(canvas.toBuffer('raw'));
  }

  sprites.forEach(sprite => sprite.remove());
  writer.end();
  debug('finished');
  renderSegment.close();
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
  const options = {
    stdio: ['pipe', stdout, stdout],
  };
  debug(`${FFMPEG_PATH} ${args.join(' ')}`);
  const child = spawn(FFMPEG_PATH, args, options);
  const promise = new Promise((resolve, reject) => {
    debug('Waiting for ffmpeg to encode');
    child.on('error', function(err) {
      // eslint-disable-next-line no-console
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
