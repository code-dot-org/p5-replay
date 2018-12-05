// Generates some random animation data formatted to feed renderer
// Usage:
// node ./scripts/generateData.js number_of_frames number_of_sprites > ./test/fixtures/replay.json
const danceParty = require('../danceParty');
const ANIMATION_COUNT = danceParty.constants.MOVE_NAMES.length;
const FRAMES_PER_ANIMATION = danceParty.constants.FRAMES;
const SPRITE_NAMES = danceParty.constants.SPRITE_NAMES;

// inferred from /dashboard/config/blocks/Dancelab/Dancelab_setBackgroundEffectWithPalette.json
const BG_EFFECT_NAMES = [
  null,
  "circles",
  "color_cycle",
  "diamonds",
  "disco_ball",
  "fireworks",
  "swirl",
  "kaleidoscope",
  "lasers",
  "splatter",
  "rainbow",
  "snowflakes",
  "text",
  "galaxy",
  "sparkles",
  "spiral",
  "disco",
  "stars",
];

const PALETTE_NAMES = [
  null,
  "rave",
  "cool",
  "electronic",
  "iceCream",
  "default",
  "neon",
  "tropical",
  "vintage",
  "warm",
];

// inferred from /dashboard/config/blocks/Dancelab/Dancelab_setForegroundEffectExtended.json
const FG_EFFECT_NAMES = [
  null,
  "bubbles",
  "confetti",
  "hearts_red",
  "music_notes",
  "pineapples",
  "pizzas",
  "smiling_poop",
  "rain",
  "floating_rainbows",
  "smile_face",
  "spotlight",
  "color_lights",
  "raining_tacos",
];

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
  visible: true,
  height: 300,
  width: 300,
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
};

const iterSprite = (sprite) => {
  // advance animation
  sprite.animationFrame = (sprite.animationFrame + 1) % FRAMES_PER_ANIMATION;

  // modify one randomly-chosen property
  const propToChange = randFromArray(Object.keys(propertyChange));
  sprite[propToChange] = propertyChange[propToChange](sprite[propToChange]);
};

const sprites = [];
for (let i = 0; i < SPRITE_COUNT; ++i) {
  sprites.push(createSprite());
}

const frames = [];
for (let i = 0; i < FRAME_COUNT; ++i) {
  const frame = {
    context: {
      backgroundColor: '#fff',
      isPeak: Math.random() < 0.05,
      centroid: 0,
      bpm: 133,
      artist: "artist",
      title: "title"
    }
  };

  if (i > 0) {
    frame.bg = frames[i-1].bg;
  } else {
    frame.bg = randFromArray(BG_EFFECT_NAMES);
  }

  if (Math.random() < 0.05) {
    frame.bg = randFromArray(BG_EFFECT_NAMES);
  }

  if (i > 0) {
    frame.palette = frames[i-1].palette;
  } else {
    frame.palette = randFromArray(PALETTE_NAMES);
  }

  if (Math.random() < 0.05) {
    frame.palette = randFromArray(PALETTE_NAMES);
  }

  if (i > 0) {
    frame.fg = frames[i-1].fg;
  } else {
    frame.fg = randFromArray(FG_EFFECT_NAMES);
  }

  if (Math.random() < 0.05) {
    frame.fg = randFromArray(FG_EFFECT_NAMES);
  }

  sprites.forEach(iterSprite);
  frame.sprites = sprites.map(sprite => Object.assign({}, sprite));

  frames.push(frame);
}

console.log(JSON.stringify(frames, null, 2));
