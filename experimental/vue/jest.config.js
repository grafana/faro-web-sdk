const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['experimental/vue/src'],
  testEnvironment: 'jsdom',
};
