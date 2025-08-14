const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/setup.jest.ts'],
  moduleNameMapper: {
    // Map @grafana/faro-core/src/* to the correct location from web-sdk
    '^@grafana/faro-core/src/(.*)$': '<rootDir>/../core/src/$1',
  },
  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
};
