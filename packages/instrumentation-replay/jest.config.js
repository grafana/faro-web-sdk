const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['packages/instrumentation-replay/src'],
  testEnvironment: 'jsdom',
};
