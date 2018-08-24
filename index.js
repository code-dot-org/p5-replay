const fs = require('fs');
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

anim = p5Inst.loadAnimation('./test/fixtures/sprite.png');
const sprite = p5Inst.createSprite();
sprite.position = createVector(200, 200);
sprite.addAnimation('default', anim);
sprite.tint = 'blue';
p5Inst.background('#fff');
p5Inst.drawSprites();

// Write an image.
const out = fs.createWriteStream('test.png');
const stream = canvas.pngStream();
stream.on('data', chunk => out.write(chunk));
stream.on('end', () => console.log('done'));
