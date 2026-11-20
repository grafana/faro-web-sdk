const { jestBaseConfig, jestCoverageConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  ...jestCoverageConfig('packages/web-tracing'),
  moduleNameMapper: {
    ...jestBaseConfig.moduleNameMapper,
    '@grafana/faro-web-sdk$': '<rootDir>/packages/web-sdk/src/index.ts',
  },
  roots: ['packages/web-tracing/src'],
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/packages/web-tracing/setup.jest.ts'],
};
