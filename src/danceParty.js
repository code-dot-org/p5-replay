const Canvas = require('canvas');

// Mock the browser environment for p5.
// Note: must be done before requiring danceParty
global.window = global;
window.performance = {now: Date.now};
window.document = {
  hasFocus: () => {},
  getElementsByTagName: () => [],
  createElement: type => {
    if (type !== 'canvas') {
      throw new Error('Cannot create type.');
    }
    const created = Canvas.createCanvas();

    // stub ctx.scale to prevent any attempt at scaling down to 0, since that
    // breaks node canvas (even though it works fine in the browser). Instead
    // just scale down to something really, really small.
    //
    // See https://github.com/Automattic/node-canvas/issues/702
    const context = created.getContext('2d');
    const origScale = context.scale;
    context.scale = function(x, y) {
      if (x === 0) {
        x = 0.001;
      }

      if (y === 0) {
        y = 0.001;
      }

      return origScale.call(this, x, y);
    };

    created.style = {};
    return created;
  },
  body: {
    //appendChild: () => {}
  }
};
window.screen = {};
window.addEventListener = () => {};
window.removeEventListener = () => {};
window.Image = Canvas.Image;
window.ImageData = Canvas.ImageData;

module.exports = require('@code-dot-org/dance-party');
