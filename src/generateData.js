// Generates some random animation data formatted to feed renderer
// Usage:
// node generateData.js number_of_frames number_of_sprites > ./test/fixtures/replay.json
const danceParty = require('@code-dot-org/dance-party');
const ANIMATION_COUNT = danceParty.constants.MOVE_NAMES.length;
const FRAMES_PER_ANIMATION = danceParty.constants.FRAMES;
const SPRITE_NAMES = danceParty.constants.SPRITE_NAMES;

const myArgs = process.argv.slice(2);
const FRAME_COUNT = parseInt(myArgs[0]);
const SPRITE_COUNT = parseInt(myArgs[1]);

const randRange = (limit) => Math.floor(Math.random()*limit);
const randFromArray = (a) => a[randRange(a.length)];

const createSprite = () => ({
  animationFrame: 0,
  animationLabel: 'anim0',
  mirrorX: -1,
  rotation: 0,
  scale: 1,
  style: randFromArray(SPRITE_NAMES),
  tint: 0,
  x: 200 + 400 * (Math.random() - .5),
  y: 200 + 400 * (Math.random() - .5),
});

const propertyChange = {
  animationLabel: () => `anim${randRange(ANIMATION_COUNT)}`,
  mirrorX: () => Math.random() < 0.5 ? -1 : 1,
  rotation: (rotation) => rotation + 2 * (Math.random() - 0.5),
  scale: (scale) => scale + (Math.random() - 0.5) / 5,
  tint: (tint) => (tint + 20 * (Math.random() - 0.5)) % 256,
  x: (x) => x + 10 * (Math.random() - 0.5),
  y: (y) => y + 10 * (Math.random() - 0.5),
}

const iterSprite = (sprite) => {
  // advance animation
  sprite.animationFrame = (sprite.animationFrame + 1) % FRAMES_PER_ANIMATION;

  // modify one randomly-chosen property
  const propToChange = randFromArray(Object.keys(propertyChange));
  sprite[propToChange] = propertyChange[propToChange](sprite[propToChange]);
}

const sprites = [];
for (let i = 0; i < SPRITE_COUNT; ++i) {
  sprites.push(createSprite());
}

const frames = [];
for (let i = 0; i < FRAME_COUNT; ++i) {
  sprites.forEach(iterSprite);
  frames.push(sprites.map(sprite => Object.assign({}, sprite)));
}

console.log(JSON.stringify(frames));
