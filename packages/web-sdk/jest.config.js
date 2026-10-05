import { jestBaseConfig } from '../../jest.config.base.js';

export default {
  ...jestBaseConfig,
  roots: ['packages/web-sdk/src'],
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/packages/web-sdk/setup.jest.ts'],
};
