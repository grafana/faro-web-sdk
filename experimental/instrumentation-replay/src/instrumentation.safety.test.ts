import { type EventEvent, type Faro, initializeFaro, type TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';
import { EventType, type eventWithTime } from '@grafana/rrweb-types';

import { ReplayInstrumentation } from './instrumentation';
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

  afterEach(() => {
    replay?.destroy();
    jest.restoreAllMocks();
    document.body.replaceChildren();
    window.sessionStorage.clear();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  function setSession(id: string, sampled = true) {
    faro.api.setSession({ id, attributes: { isSampled: String(sampled) } });
  }

  function start(options: ReplayInstrumentationOptions = {}) {
    replay = new ReplayInstrumentation({ recordAfter: 'DOMContentLoaded', ...options });
    faro.instrumentations.add(replay);
  }

  function events() {
    return transport.items as Array<TransportItem<EventEvent>>;
  }

  function recordings() {
    return events().filter((item) => item.payload.name === 'faro.session_recording.event');
  }

  it('pauses despite a capture listener failure and resumes after the listener recovers', () => {
    start({ inactivityThresholdMs: 5_000 });
    const failedCapture = () => {
      throw new Error('capture failed');
    };
    faro.metas.addCaptureListener(failedCapture);

    expect(() => jest.advanceTimersByTime(5_000)).not.toThrow();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(events().map((item) => item.payload.name)).toEqual(['faro.session_recording.started']);

    faro.metas.removeCaptureListener(failedCapture);
    emit(changeEvent());
    expect(recordings()).toEqual([]);
    document.dispatchEvent(new Event('pointerdown'));

    expect(mockRecord).toHaveBeenCalledTimes(2);
    expect(events().map((item) => item.payload.name)).toEqual([
      'faro.session_recording.started',
      'faro.session_recording.resumed',
    ]);
  });

  it('stays paused when publishing the paused event fails', () => {
    start({ inactivityThresholdMs: 5_000 });
    const pushEvent = jest.spyOn(faro.api, 'pushEvent').mockImplementationOnce(() => {
      throw new Error('publication failed');
    });

    try {
      expect(() => jest.advanceTimersByTime(5_000)).not.toThrow();
      expect(stop).toHaveBeenCalledTimes(1);
      emit(changeEvent());
      expect(recordings()).toEqual([]);
      document.dispatchEvent(new Event('pointerdown'));
      expect(mockRecord).toHaveBeenCalledTimes(2);
      expect(events().map((item) => item.payload.name)).toEqual([
        'faro.session_recording.started',
        'faro.session_recording.resumed',
      ]);
    } finally {
      pushEvent.mockRestore();
    }
  });

  it.each(['rotate', 'clear'])('does not publish a paused event after capture changes the session: %s', (action) => {
    start({ inactivityThresholdMs: 5_000 });
    const changeSession = () => {
      faro.metas.removeCaptureListener(changeSession);
      if (action === 'rotate') {
        setSession('B');
      } else {
        faro.api.setSession(undefined);
      }
    };
    faro.metas.addCaptureListener(changeSession);

    jest.advanceTimersByTime(5_000);

    expect(stop).toHaveBeenCalledTimes(1);
    expect(events().filter((item) => item.payload.name === 'faro.session_recording.paused')).toEqual([]);
  });

  it.each(['no-stop', 'throw'])('discards synchronous startup events when record fails: %s', (failure) => {
    mockRecord.mockImplementation((options) => {
      options.emit(metaEvent());
      if (failure === 'throw') {
        throw new Error('recorder failed');
      }
      return undefined;
    });
    start();
    expect(events()).toEqual([]);
  });

  it.each(['start', 'resume'])('logs stop failures when an attempt is invalidated during %s', async (phase) => {
    replay = new ReplayInstrumentation({ inactivityThresholdMs: 5_000 });
    const logWarn = jest.spyOn(replay, 'logWarn');
    if (phase === 'resume') {
      faro.instrumentations.add(replay);
      jest.advanceTimersByTime(5_000);
    }
    const previousEvents = [...events()];
    const stopError = new Error('stop failed');
    const stopInvalidated = jest.fn(() => {
      throw stopError;
    });
    mockRecord.mockImplementationOnce((options) => {
      emit = options.emit;
      emit(metaEvent());
      setSession('B');
      return stopInvalidated;
    });

    expect(() => {
      if (phase === 'resume') {
        document.dispatchEvent(new Event('pointerdown'));
      } else {
        faro.instrumentations.add(replay);
      }
    }).not.toThrow();

    expect(stopInvalidated).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenCalledWith('Failed to stop session replay', stopError);
    expect(logWarn).not.toHaveBeenCalledWith(`Failed to ${phase} session replay`, stopError);
    expect(events()).toEqual(previousEvents);
    const staleEmit = emit;
    staleEmit(changeEvent());
    expect(recordings()).toEqual([]);

    await Promise.resolve();

    expect(mockRecord).toHaveBeenCalledTimes(phase === 'resume' ? 3 : 2);
    staleEmit(changeEvent());
    expect(recordings()).toEqual([]);
    emit(changeEvent());
    expect(recordings().map((item) => item.meta.session?.id)).toEqual(['B']);
  });

  it('does not retry a failed reinitialization from a previous lifecycle', async () => {
    start();
    setSession('B');
    faro.instrumentations.remove(replay);
    mockRecord.mockReturnValueOnce(undefined);
    faro.instrumentations.add(replay);
    expect(mockRecord).toHaveBeenCalledTimes(2);

    await Promise.resolve();

    expect(mockRecord).toHaveBeenCalledTimes(2);
    setSession('B');
    await Promise.resolve();
    expect(mockRecord).toHaveBeenCalledTimes(3);
  });

  it('preserves coalescing of new starts when a previous lifecycle callback runs', async () => {
    start();
    setSession('B');
    faro.instrumentations.remove(replay);
    faro.instrumentations.add(replay);

    // Notify between the old callback and the new one; this must not queue a second retry.
    const notification = Promise.resolve().then(() => setSession('D'));
    setSession('C');
    mockRecord.mockReturnValueOnce(undefined);
    await notification;
    await Promise.resolve();

    expect(mockRecord).toHaveBeenCalledTimes(3);
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it('can restart after a removed listener queues work during destruction', async () => {
    faro.metas.addListener((meta) => {
      if (meta.session?.id === 'B') {
        faro.instrumentations.remove(replay);
      }
    });
    start();
    // Core still invokes the removed replay listener in this notification's iteration.
    setSession('B');
    faro.instrumentations.add(replay);
    await Promise.resolve();

    setSession('C');
    await Promise.resolve();

    expect(mockRecord).toHaveBeenCalledTimes(3);
    expect(stop).toHaveBeenCalledTimes(2);
    emit(changeEvent());
    expect(recordings().map((item) => item.meta.session?.id)).toEqual(['C']);
  });

  it('does not leak a recorder when a capture listener reinitializes replay', () => {
    const reinitialize = () => {
      faro.metas.removeCaptureListener(reinitialize);
      faro.instrumentations.remove(replay);
      faro.instrumentations.add(replay);
    };
    faro.metas.addCaptureListener(reinitialize);

    start();

    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
    emit(changeEvent());
    expect(recordings().map((item) => item.meta.session?.id)).toEqual(['A']);

    faro.instrumentations.remove(replay);

    expect(stop).toHaveBeenCalledTimes(1);
    emit(changeEvent());
    expect(recordings()).toHaveLength(1);
  });

  it('publishes the lifecycle marker before buffered events and then accepts live events', () => {
    mockRecord.mockImplementation((options) => {
      emit = options.emit;
      emit(metaEvent());
      emit(changeEvent());
      return stop;
    });
    start();
    emit({ ...changeEvent(), timestamp: Date.now() + 1 });
    expect(events().map((item) => item.payload.name)).toEqual([
      'faro.session_recording.started',
      'faro.session_recording.event',
      'faro.session_recording.event',
      'faro.session_recording.event',
    ]);
  });

  it.each(['rotate', 'unsample', 'away-back', 'destroy'])(
    'discards real rrweb startup invalidated by maskInputFn: %s',
    async (action) => {
      const input = document.createElement('input');
      input.value = 'private';
      document.body.appendChild(input);
      const realRecord = jest.requireActual('@grafana/rrweb').record;
      mockRecord.mockImplementation((options) => {
        const stopRecorder = realRecord(options);
        return () => {
          stop();
          stopRecorder?.();
        };
      });
      let invalidated = false;
      start({
        maskInputFn: () => {
          if (!invalidated) {
            invalidated = true;
            if (action === 'destroy') {
              replay.destroy();
            } else if (action === 'unsample') {
              setSession('A', false);
            } else {
              setSession('B');
              if (action === 'away-back') {
                setSession('A');
              }
            }
          }
          return '******';
        },
      });
      expect(invalidated).toBe(true);
      expect(stop).toHaveBeenCalledTimes(1);
      expect(events()).toEqual([]);
      await Promise.resolve();
      if (action === 'rotate' || action === 'away-back') {
        expect(events()[0]?.payload.name).toBe('faro.session_recording.started');
        expect(recordings().map((item) => JSON.parse(item.payload.attributes!['event']!).type)).toEqual([
          EventType.Meta,
          EventType.FullSnapshot,
        ]);
        expect(recordings().every((item) => item.meta.session?.id === (action === 'rotate' ? 'B' : 'A'))).toBe(true);
      } else {
        expect(events()).toEqual([]);
      }
    }
  );

  it.each(['rotate', 'unsample', 'destroy'])('discards an event invalidated inside beforeSend: %s', (action) => {
    start({
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
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('does not reconcile again between accepting an event and submitting it', () => {
    let expired = false;
    faro.metas.addCaptureListener(() => {
      if (expired) {
        setSession('B');
      }
    });
    start({
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

  it('discards serialization callbacks that invalidate the current attempt', () => {
    start();
    const event = {
      ...changeEvent(),
      toJSON: () => {
        setSession('B');
        return changeEvent();
      },
    };
    emit(event);
    expect(recordings()).toEqual([]);
  });

  it('rejects a stale rrweb callback after rotating away and back to the same session', async () => {
    start();
    const staleEmit = emit;
    setSession('B');
    setSession('A');
    await Promise.resolve();
    staleEmit(changeEvent());
    expect(recordings()).toEqual([]);
    emit(changeEvent());
    expect(recordings().map((item) => item.meta.session?.id)).toEqual(['A']);
  });

  it('reconciles a paused session before choosing resume versus a new recorder', async () => {
    let expired = false;
    faro.metas.addCaptureListener(() => {
      if (expired) {
        setSession('B');
      }
    });
    start({ inactivityThresholdMs: 1000 });
    jest.advanceTimersByTime(1000);
    expired = true;
    document.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    expect(events().filter((item) => item.payload.name === 'faro.session_recording.resumed')).toEqual([]);
    expect(
      events()
        .filter((item) => item.payload.name === 'faro.session_recording.started')
        .map((item) => item.meta.session?.id)
    ).toEqual(['A', 'B']);
  });
});
