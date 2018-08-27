const Stream = require('stream');
const spawn = require('child_process').spawn;
const ffmpeg = require('ffmpeg-static');
const Canvas = require('./node_modules/canvas');

// Mock the browser environment for p5.
global.window = global;
window.performance = {now: Date.now};
window.document = {
  hasFocus: () => {},
  createElement: type => {
    if (type !== 'canvas') {
      throw new Error('Cannot create type.');
    }
    return new Canvas();
  }
};
window.screen = {};
window.addEventListener = () => {};
window.Image = Canvas.Image;
window.ImageData = Canvas.ImageData;

const p5 = require('./node_modules/p5');
require('./node_modules/p5/lib/addons/p5.play.js');

const WIDTH = 400;
const HEIGHT = 400;

// Create our emulated canvas.
const p5Inst = new p5();
const canvas = new Canvas(WIDTH, HEIGHT);
canvas.style = {};
p5Inst._renderer = new p5.Renderer2D(canvas, p5Inst, false);
p5Inst._renderer.resize(WIDTH, HEIGHT);

// Spawn the ffmpeg process.
const toEncode = new Stream();
toEncode.writable = true;
toEncode.readable = true;
const child = spawn(ffmpeg.path, ['-i', 'pipe:', '-movflags', 'faststart', '-pix_fmt', 'yuv420p', 'video.mp4']);
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stdout);
toEncode.pipe(child.stdin);

function finishVideo() {
  toEncode.emit('end');
}

const anim = p5Inst.loadAnimation('./test/fixtures/sprite.png');
const sprite = p5Inst.createSprite();

async function generateFrame(n) {
  // Replay the capture.
  sprite.position = createVector(200 + 10 * n, 200);
  sprite.addAnimation('default', anim);
  sprite.tint = 'blue';
  p5Inst.background('#fff');
  p5Inst.drawSprites();

  return await new Promise((resolve, reject) => {
    // Write an image.
    const pngStream = canvas.pngStream();
    pngStream.on('error', reject);
    pngStream.on('data', chunk => toEncode.emit('data', chunk));
    pngStream.on('end', resolve);
  });
}

async function generateVideo() {
  for (let i = 0; i < 20; i++) {
    await generateFrame(i);
  }
}

generateVideo().then(finishVideo);
