const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['transport-batch/src'],
  testEnvironment: 'jsdom',
};
