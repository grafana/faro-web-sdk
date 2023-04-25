const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['transport-batch/src'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '@grafana/faro-core/src/(.*)': '<rootDir>/../packages/core/src/$1',
  },
};
