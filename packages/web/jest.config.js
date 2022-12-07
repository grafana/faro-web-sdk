const { jestBaseConfig } = require('../../jest.config.base');

module.exports = {
  ...jestBaseConfig,
  testEnvironment: 'jsdom',
  rootDir: '../',
  roots: ['web/src'],
  moduleNameMapper: {
    '@grafana/faro-core/src/(.*)': '<rootDir>/core/src/$1',
  },
};
