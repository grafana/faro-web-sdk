import { jest } from '@jest/globals';

import { type TransportItem, TransportItemType, Transports } from '../..';
import { mockTransports } from '../apiTestHelpers';
import { ItemBuffer } from '../ItemBuffer';

import { UserActionState } from './types';
import UserAction from './userAction';

jest.useFakeTimers();

describe('UserAction', () => {
  let transports: Transports;
  let mockPushEvent: jest.Mock;

  beforeEach(() => {
    transports = mockTransports;
    mockPushEvent = jest.fn();

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
    const ua = new UserAction({ name: 'foo', transports, trigger: 'foo', pushEvent: mockPushEvent });
    expect(ua.getState()).toBe(UserActionState.Started);
    expect(typeof ua.startTime).toBe('number');
    expect(ua.startTime! > 0).toBe(true);
  });

  it('cancel() flushes the buffer and goes to Cancelled', () => {
    const ua = new UserAction({ name: 'foo', transports, trigger: 'foo', pushEvent: mockPushEvent });
    ua.cancel();

    expect(ua.getState()).toBe(UserActionState.Cancelled);
    expect(ItemBuffer.prototype.flushBuffer).toHaveBeenCalled();
    expect(transports.execute).toHaveBeenCalled();
  });

  it('end() will not fire if action is cancelled', () => {
    const ua = new UserAction({ name: 'foo', transports, trigger: 'foo', pushEvent: mockPushEvent });
    ua.cancel();
    ua.end();
    expect(ua.getState()).toBe(UserActionState.Cancelled);
    expect(transports.execute).toHaveBeenCalled();
    expect(mockPushEvent).not.toHaveBeenCalled();
  });

  it('end() will send items with action payload', () => {
    const ua = new UserAction({ name: 'foo', transports, trigger: 'foo', pushEvent: mockPushEvent });
    ua.end();
    expect(ua.getState()).toBe(UserActionState.Ended);
    expect(transports.execute).not.toHaveBeenCalledWith('koko');
  });

  it('addItem returns true and buffers when state is Started', () => {
    const userAction = new UserAction({ name: 'foo', transports, trigger: 'foo', pushEvent: mockPushEvent });
    const item: TransportItem = { type: TransportItemType.EVENT, payload: {}, meta: {} };
    const result = userAction.addItem(item);
    expect(result).toBe(true);
  });

  it('addItem returns false when state is Halted', () => {
    const userAction = new UserAction({ name: 'foo', transports, trigger: 'foo', pushEvent: mockPushEvent });
    userAction.halt();
    const item: TransportItem = { type: TransportItemType.EVENT, payload: {}, meta: {} };
    const result = userAction.addItem(item);
    expect(result).toBe(false);
  });

  it('addItem returns false when state is Cancelled', () => {
    const userAction = new UserAction({ name: 'foo', transports, trigger: 'foo', pushEvent: mockPushEvent });
    userAction.cancel();
    const item: TransportItem = { type: TransportItemType.EVENT, payload: {}, meta: {} };
    const result = userAction.addItem(item);
    expect(result).toBe(false);
  });

  it('addItem returns false when state is Ended', () => {
    const userAction = new UserAction({ name: 'foo', transports, trigger: 'foo', pushEvent: mockPushEvent });
    userAction.end();
    const item: TransportItem = { type: TransportItemType.EVENT, payload: {}, meta: {} };
    const result = userAction.addItem(item);
    expect(result).toBe(false);
  });

  describe('duration is monotonic-clock based', () => {
    let dateNowSpy: jest.SpiedFunction<typeof Date.now>;
    let perfNowSpy: jest.SpiedFunction<typeof performance.now>;

    afterEach(() => {
      dateNowSpy?.mockRestore();
      perfNowSpy?.mockRestore();
    });

    it('computes userActionDuration from performance.now(), independent of wall-clock', () => {
      // Wall clock advances normally during the action.
      dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      // Monotonic clock at start.
      perfNowSpy = jest.spyOn(performance, 'now').mockReturnValue(500);

      const ua = new UserAction({ name: 'foo', transports, trigger: 'foo', pushEvent: mockPushEvent });

      // Advance both clocks by the same amount; monotonic delta should be 250 ms.
      dateNowSpy.mockReturnValue(1_000_250);
      perfNowSpy.mockReturnValue(750);

      ua.end();

      const [, payload] = mockPushEvent.mock.calls[0] as [string, Record<string, string>];
      expect(payload['userActionDuration']).toBe('250');
    });

    it('produces a non-negative duration even if Date.now() jumps backward mid-action (NTP step / DST)', () => {
      // Start: wall=1_000_000, mono=500.
      dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      perfNowSpy = jest.spyOn(performance, 'now').mockReturnValue(500);

      const ua = new UserAction({ name: 'foo', transports, trigger: 'foo', pushEvent: mockPushEvent });

      // Wall clock jumps BACKWARD by 5 s (e.g., NTP correction). Monotonic clock continues forward by 100 ms.
      dateNowSpy.mockReturnValue(995_000);
      perfNowSpy.mockReturnValue(600);

      ua.end();

      const [, payload] = mockPushEvent.mock.calls[0] as [string, Record<string, string>];
      // Wall-clock-based code would emit "-5000" here. Monotonic-based code emits "100".
      const duration = Number(payload['userActionDuration']);
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBe(100);
    });
  });
});
