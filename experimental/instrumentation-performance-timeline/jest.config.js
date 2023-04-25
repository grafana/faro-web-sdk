const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['experimental/instrumentation-performance-timeline/src'],
  testEnvironment: 'jsdom',
};
