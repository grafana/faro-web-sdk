const { jestBaseConfig, jestCoverageConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  ...jestCoverageConfig('experimental/instrumentation-replay'),
  roots: ['experimental/instrumentation-replay/src'],
  testEnvironment: 'jsdom',
};
