import { jestBaseConfig } from '../../jest.config.base.js';

export default {
  ...jestBaseConfig,
  roots: ['packages/web-tracing/src'],
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/packages/web-tracing/setup.jest.ts'],
};
