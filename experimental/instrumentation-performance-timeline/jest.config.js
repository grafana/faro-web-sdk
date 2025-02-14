const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['experimental/instrumentation-performance-timeline/src'],
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/packages/instrumentation-performance-timeline/setup.jest.ts'],
};
