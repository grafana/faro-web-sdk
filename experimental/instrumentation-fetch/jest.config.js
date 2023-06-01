const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['experimental/instrumentation-fetch/src'],
  testEnvironment: 'jsdom',
};
