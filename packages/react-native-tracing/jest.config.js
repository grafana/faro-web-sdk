const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['packages/web-tracing/src'],
  testEnvironment: 'jsdom',
};
