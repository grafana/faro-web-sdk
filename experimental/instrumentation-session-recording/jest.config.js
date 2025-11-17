const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['experimental/instrumentation-session-recording/src'],
  testEnvironment: 'jsdom',
};
