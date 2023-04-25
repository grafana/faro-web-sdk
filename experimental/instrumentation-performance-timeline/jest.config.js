const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['instrumentation-performance-timeline/src'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '@grafana/faro-core/src/(.*)': '<rootDir>/../packages/core/src/$1',
  },
};
