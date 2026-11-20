const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['packages/sampling/src'],
  setupFiles: ['<rootDir>/packages/sampling/setup.jest.ts'],
};
