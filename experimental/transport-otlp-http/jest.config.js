const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['experimental/transport-otlp-http/src'],
  testEnvironment: 'jsdom',
};
