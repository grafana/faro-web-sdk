const { jestBaseConfig, jestCoverageConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  ...jestCoverageConfig('experimental/transport-otlp-http'),
  roots: ['experimental/transport-otlp-http/src'],
  testEnvironment: 'jsdom',
};
