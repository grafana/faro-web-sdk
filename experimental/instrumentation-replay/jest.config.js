const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['experimental/instrumentation-replay/src'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/experimental/instrumentation-replay/setup.jest.ts'],
};
