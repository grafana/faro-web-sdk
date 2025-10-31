import { jest } from '@jest/globals';

import { type TransportItem, TransportItemType, Transports } from '../..';
import { mockTransports } from '../apiTestHelpers';
import { ItemBuffer } from '../ItemBuffer';

import { UserActionState } from './types';
import UserAction from './userAction';

jest.useFakeTimers();
jest.mock('../../sdk/registerFaro', () => ({
  faro: {
    api: {
      pushEvent: jest.fn(),
    },
  },
}));

describe('UserAction', () => {
  let transports: Transports;

  beforeEach(() => {
    transports = mockTransports;

    jest.spyOn(ItemBuffer.prototype, 'flushBuffer').mockImplementation((cb?: (item: TransportItem) => void) => {
      if (cb) {
        const dummyItem = { type: TransportItemType.EVENT, payload: {}, meta: {} };
        cb(dummyItem);
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('initializes in Started state and sets startTime', () => {
    const ua = new UserAction({ name: 'foo', transports, trigger: 'foo' });
    expect(ua.getState()).toBe(UserActionState.Started);
    expect(typeof ua.startTime).toBe('number');
    expect(ua.startTime! > 0).toBe(true);
  });

  it('cancel() flushes the buffer and goes to Cancelled', () => {
    const ua = new UserAction({ name: 'foo', transports, trigger: 'foo' });
    ua.cancel();

    expect(ua.getState()).toBe(UserActionState.Cancelled);
    expect(ItemBuffer.prototype.flushBuffer).toHaveBeenCalled();
    expect(transports.execute).not.toHaveBeenCalled();
  });

  it('end() will not fire if action is cancelled', () => {
    const ua = new UserAction({ name: 'foo', transports, trigger: 'foo' });
    ua.cancel();
    ua.end();
    expect(ua.getState()).toBe(UserActionState.Cancelled);
  });

  it('end() will send items with action payload', () => {
    const ua = new UserAction({ name: 'foo', transports, trigger: 'foo' });
    ua.end();
    expect(ua.getState()).toBe(UserActionState.Ended);
    expect(transports.execute).not.toHaveBeenCalledWith('koko');
  });

  it('addItem returns true and buffers when state is Started', () => {
    const userAction = new UserAction({ name: 'foo', transports, trigger: 'foo' });
    const item: TransportItem = { type: TransportItemType.EVENT, payload: {}, meta: {} };
    const result = userAction.addItem(item);
    expect(result).toBe(true);
  });

  it('addItem returns false when state is Halted', () => {
    const userAction = new UserAction({ name: 'foo', transports, trigger: 'foo' });
    userAction.extend(() => true);
    jest.advanceTimersByTime(userAction.cancelTimeout);
    expect(userAction.getState()).toBe(UserActionState.Halted);
    const item: TransportItem = { type: TransportItemType.EVENT, payload: {}, meta: {} };
    const result = userAction.addItem(item);
    expect(result).toBe(false);
  });

  it('addItem returns false when state is Cancelled', () => {
    const userAction = new UserAction({ name: 'foo', transports, trigger: 'foo' });
    userAction.cancel();
    const item: TransportItem = { type: TransportItemType.EVENT, payload: {}, meta: {} };
    const result = userAction.addItem(item);
    expect(result).toBe(false);
  });

  it('addItem returns false when state is Ended', () => {
    const userAction = new UserAction({ name: 'foo', transports, trigger: 'foo' });
    userAction.end();
    const item: TransportItem = { type: TransportItemType.EVENT, payload: {}, meta: {} };
    const result = userAction.addItem(item);
    expect(result).toBe(false);
  });
});
