const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['experimental/chrome-extension/src'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    ...jestBaseConfig.moduleNameMapper,
    '@grafana/faro-web-sdk$': '<rootDir>/packages/web-sdk/src/index.ts',
  },
  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      {
        tsconfig: 'experimental/chrome-extension/tsconfig.spec.json',
      },
    ],
  },
};
