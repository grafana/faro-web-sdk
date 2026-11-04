import { jestBaseConfig } from '../../jest.config.base.js';

export default {
  ...jestBaseConfig,
  roots: ['experimental/transport-otlp-http/src'],
  testEnvironment: 'jsdom',
};
