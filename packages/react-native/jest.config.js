const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  preset: 'react-native',
  displayName: 'react-native',
  testMatch: ['<rootDir>/packages/react-native/src/**/*.test.ts'],
  transform: {
    '^.+\\.(js|ts|tsx)$': [
      'babel-jest',
      {
        presets: ['module:@react-native/babel-preset'],
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-device-info|@react-native-async-storage)/)',
  ],
  moduleNameMapper: {
    ...jestBaseConfig.moduleNameMapper,
  },
  setupFiles: ['<rootDir>/packages/react-native/src/testUtils/setupTests.ts'],
};
