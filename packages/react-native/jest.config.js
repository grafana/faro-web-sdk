const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  displayName: 'react-native',
  testMatch: ['<rootDir>/packages/react-native/src/**/*.test.ts'],
  testEnvironment: 'node',
};
