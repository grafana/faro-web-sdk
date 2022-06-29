module.exports = {
  ...require('../../jest.config'),
  testEnvironment: 'jsdom',
  rootDir: '../',
  roots: ['web/src'],
  moduleNameMapper: {
    '@grafana/agent-core/src/(.*)': '<rootDir>/core/src/$1',
  },
};
