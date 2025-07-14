const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['packages/web-session-recording/src'],
  testEnvironment: 'jsdom',
};
