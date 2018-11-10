/**
 * Manually trigger a redownload of all sprite data
 */
const danceParty = require('@code-dot-org/dance-party');
const SPRITE_NAMES = danceParty.constants.SPRITE_NAMES;
const MOVE_NAMES = danceParty.constants.MOVE_NAMES;
const IMAGE_S3_BASE = "http://s3.amazonaws.com/cdo-curriculum/images/sprites/spritesheet_tp/";
const IMAGE_BASE = "./images/";

const http = require('http');
const fs = require('fs');

SPRITE_NAMES.forEach((sprite) => {
  MOVE_NAMES.forEach((move) => {
    ["png", "json"].forEach((extension) => {
      const local_file = `${IMAGE_BASE}${sprite}_${move.name}.${extension}`;
      const url = `${IMAGE_S3_BASE}${sprite}_${move.name}.${extension}`;
      const file = fs.createWriteStream(local_file);
      console.log(url);
      http.get(url, (response) => {
        console.log("done");
        response.pipe(file);
      });
    });
  });
});
