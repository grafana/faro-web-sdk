const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['experimental/transport-batch/src'],
  testEnvironment: 'jsdom',
};
