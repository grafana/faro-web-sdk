const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['instrumentation-performance-timeline'],
  testEnvironment: 'jsdom',
};
