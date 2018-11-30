// Simple wrapper for console.log; could be used to conditionally disable logging
module.exports.debug = function debug(str) {
  // eslint-disable-next-line no-console
  console.log(str);
};
