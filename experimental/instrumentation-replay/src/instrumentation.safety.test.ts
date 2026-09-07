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
