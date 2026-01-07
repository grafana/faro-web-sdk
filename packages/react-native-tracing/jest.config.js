const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['packages/react-native-tracing/src'],
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/packages/react-native-tracing/setup.jest.ts'],
};
