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

// Replay the capture.
anim = p5Inst.loadAnimation('./test/fixtures/sprite.png');
const sprite = p5Inst.createSprite();
sprite.position = createVector(200, 200);
sprite.addAnimation('default', anim);
sprite.tint = 'blue';
p5Inst.background('#fff');
p5Inst.drawSprites();

// Write an image.
const pngStream = canvas.pngStream();
pngStream.on('data', chunk => toEncode.emit('data', chunk));
pngStream.on('end', () => {
  console.log('done');
  toEncode.emit('end');
});
