const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['experimental/instrumentation-performance-timeline/src'],
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/experimental/instrumentation-performance-timeline/setup.jest.ts'],
};
