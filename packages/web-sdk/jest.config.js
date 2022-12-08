const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  testEnvironment: 'jsdom',
  rootDir: '../',
  roots: ['web-sdk/src'],
  moduleNameMapper: {
    '@grafana/faro-core/src/(.*)': '<rootDir>/core/src/$1',
  },
};
