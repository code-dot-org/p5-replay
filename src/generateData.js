// Generates some random animation data formatted to feed renderer
// Usage:
// node generateData.js number_of_frames number_of_sprites > ./test/fixtures/replay.json

const myArgs = process.argv.slice(2);
const FRAMES = parseInt(myArgs[0]);
const SPRITE_COUNT = parseInt(myArgs[1]);

const sprites = [];
for (let i = 0; i < SPRITE_COUNT; ++i) {
  sprites.push({
    tint: "rgba(255,255,255,1)",
    x: 200 + 400 * (Math.random() - .5),
    y: 200 + 400 * (Math.random() - .5),
  });
}

const frames = [];
for (let i = 0; i < FRAMES; ++i) {
  const frameData = {};
  for (let j = 0; j < SPRITE_COUNT; ++j) {
    frameData[j] = {
      tint: sprites[j].tint,
      x: sprites[j].x,
      y: sprites[j].y
    };
    // Random wiggle
    sprites[j].x += 5 * (Math.random() - .5);
    sprites[j].y += 5 * (Math.random() - .5);
  }
  frames.push(frameData);
}

console.log(JSON.stringify(frames));
