const { jestBaseConfig } = require('../../jest.config.base.js');

module.exports = {
  ...jestBaseConfig,
  roots: ['experimental/instrumentation-xhr/src'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@remix-run/router$': '<rootDir>/index.ts',
    '^@remix-run/web-blob$': require.resolve('@remix-run/web-blob'),
    '^@remix-run/web-fetch$': require.resolve('@remix-run/web-fetch'),
    '^@remix-run/web-form-data$': require.resolve('@remix-run/web-form-data'),
    '^@remix-run/web-stream$': require.resolve('@remix-run/web-stream'),
    '^@web3-storage/multipart-parser$': require.resolve('@web3-storage/multipart-parser'),
  },
  setupFiles: ['<rootDir>/experimental/instrumentation-xhr/setup.jest.ts'],
};
