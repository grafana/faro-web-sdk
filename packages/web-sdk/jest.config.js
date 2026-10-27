const { jestBaseConfig, jestCoverageConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  ...jestCoverageConfig('packages/web-sdk'),
  roots: ['packages/web-sdk/src'],
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/packages/web-sdk/setup.jest.ts'],
};
