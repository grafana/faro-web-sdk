import type { Transports } from '../transports';

import type { TracesAPI } from './traces/types';
import type { UserActionsAPI } from './userActions/types';

export const mockMetas = {
  add: jest.fn(),
  remove: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  value: {},
};

export const mockTransports: Transports = {
  add: jest.fn(),
  addBeforeSendHooks: jest.fn(),
  execute: jest.fn(),
  getBeforeSendHooks: jest.fn(),
  remove: jest.fn(),
  removeBeforeSendHooks: jest.fn(),
  isPaused: function (): boolean {
    throw new Error('Function not implemented.');
  },
  transports: [],
  pause: function (): void {
    throw new Error('Function not implemented.');
  },
  unpause: function (): void {
    throw new Error('Function not implemented.');
  },
};

export const mockTracesApi: TracesAPI = {
  getOTEL: jest.fn(),
  getTraceContext: jest.fn(),
  initOTEL: jest.fn(),
  isOTELInitialized: jest.fn(),
  pushTraces: jest.fn(),
};

export const mockUserActionsApi: UserActionsAPI = {
  startUserAction: jest.fn(),
  getActiveUserAction: jest.fn(),
};
