const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['transport-otlp-http/src'],
  testEnvironment: 'jsdom',
};
