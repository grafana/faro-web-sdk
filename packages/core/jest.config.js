const { jestBaseConfig, jestCoverageConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  ...jestCoverageConfig('packages/core'),
  roots: ['packages/core/src'],
};
