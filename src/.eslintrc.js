module.exports = {
  globals: {
    'window': true,
  },
  env: {
    node: true,
    es6: true,
  },
  'extends': 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2017,
  },
  rules: {
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    semi: ['error', 'always'],
  },
};
