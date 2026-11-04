import { jestBaseConfig } from '../../jest.config.base.js';

export default {
  ...jestBaseConfig,
  roots: ['experimental/instrumentation-replay/src'],
  testEnvironment: 'jsdom',
};
