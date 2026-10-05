import { jestBaseConfig } from '../../jest.config.base.js';

export default {
  ...jestBaseConfig,
  roots: ['packages/core/src'],
};
