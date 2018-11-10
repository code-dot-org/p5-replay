const LOCAL = process.env.AWS_SAM_LOCAL;

module.exports.debug = function debug(str) {
  if (LOCAL) {
    // eslint-disable-next-line no-console
    console.log(str);
  }
};
