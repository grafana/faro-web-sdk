const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['packages/web-sdk/src'],
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/packages/web-sdk/setup.jest.ts'],
};
