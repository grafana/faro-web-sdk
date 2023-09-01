const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['experimental/instrumentation-k6-browser/src'],
  testEnvironment: 'jsdom',
};
