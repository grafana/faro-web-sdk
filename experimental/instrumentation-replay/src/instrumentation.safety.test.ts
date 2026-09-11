import { type EventEvent, type Faro, initializeFaro, type TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';
import { EventType, type eventWithTime } from '@grafana/rrweb-types';

import { getRecordingDocument } from './documentLifecycle';
import { ReplayInstrumentation } from './instrumentation';
import { replayRecordingStorageKeyPrefix } from './recordingState';
import type { ReplayInstrumentationOptions } from './types';

jest.mock('@grafana/rrweb', () => ({ record: jest.fn() }));

const metaEvent = (): eventWithTime => ({
  type: EventType.Meta,
  data: { href: 'https://example.com/', width: 1, height: 1 },
  timestamp: Date.now(),
});
const changeEvent = (): eventWithTime => ({
  type: EventType.Custom,
  data: { tag: 'change', payload: null },
  timestamp: Date.now(),
});
const flush = () => jest.advanceTimersByTimeAsync(0);

describe('Replay callback and startup safety', () => {
  let faro: Faro;
  let replay: ReplayInstrumentation;
  let transport: MockTransport;
  let mockRecord: jest.Mock;
  let emit: (event: eventWithTime) => void;
  let stop: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    mockRecord = require('@grafana/rrweb').record;
    mockRecord.mockReset();
    stop = jest.fn();
    mockRecord.mockImplementation((options) => {
      emit = options.emit;
      return stop;
    });
    transport = new MockTransport();
    faro = initializeFaro(mockConfig({ transports: [transport] }));
    setSession('A');
  });

  afterEach(async () => {
    window.dispatchEvent(new Event('pagehide'));
    replay?.destroy();
    await flush();
    jest.restoreAllMocks();
    document.body.replaceChildren();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  function setSession(id: string, sampled = true) {
    faro.api.setSession({ id, attributes: { isSampled: String(sampled) } });
  }

  async function start(options: ReplayInstrumentationOptions = {}) {
    replay = new ReplayInstrumentation({ recordAfter: 'DOMContentLoaded', ...options });
    faro.instrumentations.add(replay);
    await flush();
  }

  function events() {
    return transport.items as Array<TransportItem<EventEvent>>;
  }

  function recordings() {
    return events().filter((item) => item.payload.name === 'faro.session_recording.event');
  }

  function hasActiveCheckpoint() {
    return Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith(replayRecordingStorageKeyPrefix))
      .some((key) => JSON.parse(window.sessionStorage.getItem(key)!).handoff === 'active');
  }

  it('stays paused when publishing the paused event fails', async () => {
    await start({ inactivityThresholdMs: 1_000 });
    jest.spyOn(faro.api, 'pushEvent').mockImplementationOnce(() => {
      throw new Error('publication failed');
    });
    await jest.advanceTimersByTimeAsync(1_000);
    expect(stop).toHaveBeenCalledTimes(1);
    emit(changeEvent());
    expect(recordings()).toEqual([]);
    document.dispatchEvent(new Event('pointerdown'));
    await flush();
    expect(mockRecord).toHaveBeenCalledTimes(2);
    expect(events().map((item) => item.payload.name)).toEqual([
      'faro.session_recording.started',
      'faro.session_recording.resumed',
    ]);
  });

  it.each(['rotate', 'clear'])(
    'does not publish a paused event after capture changes the session: %s',
    async (action) => {
      await start({ inactivityThresholdMs: 1_000 });
      const changeSession = () => {
        faro.metas.removeCaptureListener!(changeSession);
        if (action === 'rotate') {
          setSession('B');
        } else {
          faro.api.setSession(undefined);
        }
      };
      faro.metas.addCaptureListener!(changeSession);
      await jest.advanceTimersByTimeAsync(1_000);
      expect(stop).toHaveBeenCalledTimes(1);
      expect(events().filter((item) => item.payload.name === 'faro.session_recording.paused')).toEqual([]);
    }
  );

  it.each(['no-stop', 'throw'])(
    'discards failed startup events, releases the lease, and retries only on input: %s',
    async (failure) => {
      let failedId: string | undefined;
      mockRecord.mockImplementationOnce((options) => {
        failedId = JSON.parse(window.sessionStorage.getItem(Object.keys(window.sessionStorage)[0]!)!).recordingId;
        options.emit(metaEvent());
        if (failure === 'throw') {
          throw new Error('recorder failed');
        }
        return undefined;
      });
      await start();
      expect(events()).toEqual([]);
      expect((await navigator.locks.query()).held).toEqual([]);
      await flush();
      expect(mockRecord).toHaveBeenCalledTimes(1);
      document.dispatchEvent(new Event('keydown'));
      await flush();
      emit(metaEvent());
      expect(recordings()[0]!.payload.attributes).toMatchObject({ recording_id: failedId, seq: '0', gen: '0' });
    }
  );

  it.each(['start', 'resume'])(
    'stops a stale returned handle after the enclosing %s call and releases despite a stop error',
    async (phase) => {
      replay = new ReplayInstrumentation({ inactivityThresholdMs: 1_000 });
      const logWarn = jest.spyOn(replay, 'logWarn');
      if (phase === 'resume') {
        faro.instrumentations.add(replay);
        await flush();
        await jest.advanceTimersByTimeAsync(1_000);
      }
      let staleEmit!: typeof emit;
      const stopError = new Error('stop failed');
      const order: string[] = [];
      const staleStop = jest.fn(() => {
        order.push('stop');
        throw stopError;
      });
      mockRecord.mockImplementationOnce((options) => {
        staleEmit = options.emit;
        options.emit(metaEvent());
        setSession('B');
        expect(staleStop).not.toHaveBeenCalled();
        order.push('record returned');
        return staleStop;
      });
      if (phase === 'resume') {
        document.dispatchEvent(new Event('pointerdown'));
      } else {
        faro.instrumentations.add(replay);
      }
      await flush();
      expect(order).toEqual(['record returned', 'stop']);
      expect(staleStop).toHaveBeenCalledTimes(1);
      expect(logWarn).toHaveBeenCalledWith('Failed to stop session replay', stopError);
      expect(mockRecord).toHaveBeenCalledTimes(phase === 'resume' ? 3 : 2);
      expect((await navigator.locks.query()).held).toHaveLength(1);
      staleEmit(changeEvent());
      expect(recordings()).toEqual([]);
      emit(changeEvent());
      expect(recordings().map((item) => item.meta.session?.id)).toEqual(['B']);
    }
  );

  it.each(['start', 'resume'])(
    'retains the returned stop handle when post-%s metadata validation throws',
    async (phase) => {
      if (phase === 'resume') {
        await start({ inactivityThresholdMs: 1_000 });
        await jest.advanceTimersByTimeAsync(1_000);
      }
      let fail = false;
      faro.metas.add(() => {
        if (fail) {
          fail = false;
          throw new Error('metadata getter failed');
        }
        return {};
      });
      mockRecord.mockImplementationOnce((options) => {
        emit = options.emit;
        fail = true;
        return stop;
      });
      if (phase === 'start') {
        await start();
      } else {
        document.dispatchEvent(new Event('pointerdown'));
        await flush();
      }
      expect(stop).toHaveBeenCalledTimes(phase === 'start' ? 1 : 2);
      emit(changeEvent());
      expect(recordings()).toEqual([]);
      expect((await navigator.locks.query()).held).toHaveLength(phase === 'start' ? 0 : 1);
    }
  );

  it('does not let a removed metadata callback queue work for its replacement', async () => {
    faro.metas.addListener((meta) => {
      if (meta.session?.id === 'B') {
        faro.instrumentations.remove(replay);
      }
    });
    await start();
    setSession('B');
    faro.instrumentations.add(replay);
    await flush();
    setSession('C');
    await flush();
    expect(mockRecord).toHaveBeenCalledTimes(3);
    expect(stop).toHaveBeenCalledTimes(2);
    emit(changeEvent());
    expect(recordings().map((item) => item.meta.session?.id)).toEqual(['C']);
  });

  it('does not retain a document subscriber when metadata registration removes Replay', async () => {
    const subscribe = jest.spyOn(getRecordingDocument(), 'subscribe');
    const addListener = faro.metas.addListener;
    jest.spyOn(faro.metas, 'addListener').mockImplementation((listener) => {
      addListener(listener);
      faro.instrumentations.remove(replay);
    });
    await start();
    expect(subscribe).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
    expect(faro.instrumentations.instrumentations).toHaveLength(0);
  });

  it('releases unused ownership when dynamic metadata withdraws eligibility after grant', async () => {
    let eligible = true;
    faro.metas.add(() => ({ session: eligible ? { id: 'A', attributes: { isSampled: 'true' } } : undefined }));
    const withdraw = () => {
      if (hasActiveCheckpoint()) {
        eligible = false;
      }
    };
    faro.metas.addCaptureListener!(withdraw);
    await start();
    expect(mockRecord).not.toHaveBeenCalled();
    expect((await navigator.locks.query()).held).toEqual([]);
    faro.metas.removeCaptureListener!(withdraw);
    eligible = true;
    document.dispatchEvent(new Event('pointerdown'));
    await flush();
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });

  it('does not start rrweb after an eligibility getter destroys the granted owner', async () => {
    let invalidate = false;
    faro.metas.add(() => {
      if (invalidate) {
        invalidate = false;
        replay.destroy();
      }
      return {};
    });
    const capture = faro.metas.capture!;
    jest.spyOn(faro.metas, 'capture').mockImplementation((callback) =>
      capture(
        callback &&
          (() => {
            invalidate = hasActiveCheckpoint();
            callback();
          })
      )
    );
    await start();
    expect(mockRecord).not.toHaveBeenCalled();
    expect((await navigator.locks.query()).held).toEqual([]);
  });

  it.each(['start', 'resume'])('preserves a replacement installed by capture during %s', async (phase) => {
    if (phase === 'resume') {
      await start({ inactivityThresholdMs: 1_000 });
      await jest.advanceTimersByTimeAsync(1_000);
    }
    const reinitialize = () => {
      faro.metas.removeCaptureListener!(reinitialize);
      faro.instrumentations.remove(replay);
      faro.instrumentations.add(replay);
    };
    faro.metas.addCaptureListener!(reinitialize);
    if (phase === 'start') {
      await start();
    } else {
      document.dispatchEvent(new Event('pointerdown'));
      await flush();
    }
    expect(mockRecord).toHaveBeenCalledTimes(phase === 'resume' ? 2 : 1);
    emit(changeEvent());
    expect(recordings().map((item) => item.meta.session?.id)).toEqual(['A']);
    faro.instrumentations.remove(replay);
    await flush();
    expect((await navigator.locks.query()).held).toEqual([]);
    emit(changeEvent());
    expect(recordings()).toHaveLength(1);
  });

  it.each(['startup', 'checkout', 'deferred'])(
    'guards real rrweb %s through reentrant input masking and replacement',
    async (phase) => {
      const input = document.createElement('input');
      input.value = 'private';
      document.body.appendChild(input);
      const realRecord = jest.requireActual('@grafana/rrweb').record;
      const readyState =
        phase === 'deferred' ? jest.spyOn(document, 'readyState', 'get').mockReturnValue('loading') : undefined;
      const order: string[] = [];
      mockRecord.mockImplementation((options) => {
        const stopRecorder = realRecord(options);
        return () => {
          order.push('stop');
          stop();
          stopRecorder?.();
        };
      });
      let invalidate = phase !== 'checkout';
      await start({
        maskInputFn: () => {
          if (invalidate) {
            invalidate = false;
            const count = stop.mock.calls.length;
            setSession('B');
            expect(stop).toHaveBeenCalledTimes(count);
            order.push('mask returned');
          }
          return '******';
        },
      });
      if (phase === 'checkout') {
        transport.items.splice(0);
        invalidate = true;
        realRecord.takeFullSnapshot();
      } else if (phase === 'deferred') {
        readyState!.mockReturnValue('interactive');
        document.dispatchEvent(new Event('DOMContentLoaded'));
      }
      await flush();
      expect(order.slice(0, 2)).toEqual(['mask returned', 'stop']);
      expect(stop).toHaveBeenCalledTimes(1);
      expect(
        recordings()
          .filter((item) => item.meta.session?.id === 'A')
          .some((item) => JSON.parse(item.payload.attributes!['event']!).type === EventType.FullSnapshot)
      ).toBe(false);
      const current = recordings().filter((item) => item.meta.session?.id === 'B');
      expect(current.map((item) => JSON.parse(item.payload.attributes!['event']!).type)).toEqual([
        EventType.Meta,
        EventType.FullSnapshot,
      ]);
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 7 }));
      await flush();
      expect(recordings().at(-1)!.meta.session?.id).toBe('B');
      readyState?.mockRestore();
    }
  );

  it.each(['rotate', 'unsample', 'destroy'])('discards an event invalidated inside beforeSend: %s', async (action) => {
    await start({
      beforeSend: (event) => {
        if (action === 'destroy') {
          replay.destroy();
        } else {
          setSession(action === 'rotate' ? 'B' : 'A', action !== 'unsample');
        }
        return event;
      },
    });
    emit(changeEvent());
    expect(recordings()).toEqual([]);
    expect(stop).not.toHaveBeenCalled();
    await flush();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('keeps the accepted capture through filtering and reconciles again on the next event', async () => {
    let expired = false;
    faro.metas.addCaptureListener!(() => {
      if (expired) {
        setSession('B');
      }
    });
    await start({
      beforeSend: (event) => {
        expired = true;
        return event;
      },
    });
    emit(changeEvent());
    expect(recordings().map((item) => item.meta.session?.id)).toEqual(['A']);
    emit(changeEvent());
    expect(recordings().map((item) => item.meta.session?.id)).toEqual(['A']);
    expect(faro.api.getSession()?.id).toBe('B');
  });

  it('rejects serialization invalidation and old callbacks even after returning to the same session', async () => {
    await start();
    const staleEmit = emit;
    const invalidated = {
      ...changeEvent(),
      toJSON: () => {
        setSession('B');
        return changeEvent();
      },
    };
    emit(invalidated);
    expect(recordings()).toEqual([]);
    setSession('A');
    await flush();
    staleEmit(changeEvent());
    expect(recordings()).toEqual([]);
    emit(changeEvent());
    expect(recordings().map((item) => item.meta.session?.id)).toEqual(['A']);
  });
});
