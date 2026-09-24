import { jestBaseConfig } from '../../jest.config.base.js';

export default {
  ...jestBaseConfig,
  moduleNameMapper: {
    ...jestBaseConfig.moduleNameMapper,
    '@grafana/faro-web-sdk$': '<rootDir>/packages/web-sdk/src/index.ts',
  },
  roots: ['packages/web-tracing/src'],
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/packages/web-tracing/setup.jest.ts'],
};
