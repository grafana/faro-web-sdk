import { type EventEvent, type Faro, initializeFaro, type TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';
import type { recordOptions } from '@grafana/rrweb';
import { EventType, type eventWithTime } from '@grafana/rrweb-types';

import { defaultMaskInputFn } from './const';
import { ReplayInstrumentation } from './instrumentation';
import { recordingLockName, replayRecordingStorageKeyPrefix } from './recordingState';
import type { ReplayInstrumentationOptions } from './types';

jest.mock('@grafana/rrweb', () => ({ record: jest.fn() }));

const namespace = '["owner","app","ns","test"]';
const key = `${replayRecordingStorageKeyPrefix}${namespace}`;
const metaEvent = (href = 'https://user:password@example.com/path?token=secret#fragment'): eventWithTime => ({
  type: EventType.Meta,
  timestamp: Date.now(),
  data: { href, width: 1, height: 1 },
});
const changeEvent = (tag = 'change'): eventWithTime => ({
  type: EventType.Custom,
  timestamp: Date.now(),
  data: { tag, payload: null },
});
const flush = () => jest.advanceTimersByTimeAsync(0);

describe('ReplayInstrumentation', () => {
  let sdk: Faro;
  let transport: MockTransport;
  let mockRecord: jest.Mock;
  let attempts: Array<{ options: recordOptions<eventWithTime>; stop: jest.Mock }>;
  let recorders: ReplayInstrumentation[];

  beforeEach(() => {
    jest.useFakeTimers();
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    attempts = [];
    recorders = [];
    mockRecord = require('@grafana/rrweb').record;
    mockRecord.mockReset().mockImplementation((options) => {
      const stop = jest.fn();
      attempts.push({ options, stop });
      return stop;
    });
    transport = new MockTransport();
    sdk = initializeFaro(
      mockConfig({
        transports: [transport],
        dedupe: true,
        globalObjectKey: 'owner',
        app: { name: 'app', namespace: 'ns', environment: 'test', version: '1' },
      })
    );
    setSession('A');
  });

  afterEach(async () => {
    window.dispatchEvent(new Event('pagehide'));
    recorders.forEach((replay) => replay.destroy());
    await flush();
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  function setSession(id?: string, sampled = true) {
    sdk.api.setSession({ id, attributes: { isSampled: String(sampled) } });
  }

  async function start(options: ReplayInstrumentationOptions = {}, target = sdk) {
    const replay = new ReplayInstrumentation(options);
    recorders.push(replay);
    target.instrumentations.add(replay);
    await flush();
    return replay;
  }

  function events(name?: string) {
    const items = transport.items as Array<TransportItem<EventEvent>>;
    return name ? items.filter((item) => item.payload.name === `faro.session_recording.${name}`) : items;
  }

  function recordings() {
    return events('event').map((item) => item.payload.attributes!);
  }

  function emit(event: eventWithTime, index = attempts.length - 1) {
    attempts[index]!.options.emit!(event);
  }

  it('keeps the active marker ahead of startup publication and preserves buffered ordering', async () => {
    mockRecord.mockImplementationOnce((options) => {
      expect(JSON.parse(window.sessionStorage.getItem(key)!).handoff).toBe('active');
      options.emit(metaEvent());
      options.emit(changeEvent('startup'));
      return jest.fn();
    });
    await start();
    expect(events().map((item) => item.payload.name)).toEqual([
      'faro.session_recording.started',
      'faro.session_recording.event',
      'faro.session_recording.event',
    ]);
    expect(recordings().map((item) => [item['seq'], item['gen']])).toEqual([
      ['0', '0'],
      ['1', '0'],
    ]);
  });

  it('reserves immutable sequence and generation before reentrant serialization', async () => {
    await start();
    emit(metaEvent());
    const outer = {
      ...changeEvent('outer'),
      toJSON: () => {
        emit(metaEvent());
        return changeEvent('outer');
      },
    };
    emit(outer);
    expect(recordings().map((item) => [item['seq'], item['gen']])).toEqual([
      ['0', '0'],
      ['2', '1'],
      ['1', '0'],
    ]);
  });

  it('leaves a sequence gap when an accepted Meta cannot be serialized', async () => {
    await start();
    emit(metaEvent());
    const invalid = {
      ...metaEvent(),
      toJSON: () => {
        throw new Error('serialization');
      },
    };
    emit(invalid);
    emit(changeEvent());
    expect(recordings().map((item) => [item['seq'], item['gen']])).toEqual([
      ['0', '0'],
      ['2', '1'],
    ]);
  });

  it.each([null, undefined])('allows Replay filters to drop snapshots without consuming counters: %s', async (drop) => {
    await start({ beforeSend: (event) => (event.type === EventType.Meta ? drop : event) });
    emit(metaEvent());
    emit(changeEvent());
    expect(recordings().map((item) => [item['seq'], item['gen']])).toEqual([['0', '0']]);
  });

  it('keeps the lease across inactivity, coalesces overlapping resumes, and emits every completed transition', async () => {
    await start({ inactivityThresholdMs: 1000 });
    emit(metaEvent());
    const id = recordings()[0]!['recording_id'];
    await jest.advanceTimersByTimeAsync(1000);
    expect(attempts[0]!.stop).toHaveBeenCalledTimes(1);
    expect((await navigator.locks.query()).held).toEqual([
      { name: recordingLockName(namespace, id!), mode: 'exclusive' },
    ]);
    mockRecord.mockImplementationOnce((options) => {
      document.dispatchEvent(new Event('pointerdown'));
      options.emit(metaEvent());
      const stop = jest.fn();
      attempts.push({ options, stop });
      return stop;
    });
    document.dispatchEvent(new Event('pointerdown'));
    document.dispatchEvent(new Event('input'));
    await flush();
    expect(mockRecord).toHaveBeenCalledTimes(2);
    expect(recordings().map((item) => [item['recording_id'], item['seq'], item['gen']])).toEqual([
      [id, '0', '0'],
      [id, '1', '1'],
    ]);
    await jest.advanceTimersByTimeAsync(1000);
    document.dispatchEvent(new Event('keydown'));
    await flush();
    expect(
      events()
        .filter((item) => item.payload.name !== 'faro.session_recording.event')
        .map((item) => item.payload.name)
    ).toEqual([
      'faro.session_recording.started',
      'faro.session_recording.paused',
      'faro.session_recording.resumed',
      'faro.session_recording.paused',
      'faro.session_recording.resumed',
    ]);
  });

  it.each(['no-stop', 'throw'])('returns a failed resume to Paused for the next interaction: %s', async (failure) => {
    await start({ inactivityThresholdMs: 1000 });
    emit(metaEvent());
    const id = recordings()[0]!['recording_id'];
    await jest.advanceTimersByTimeAsync(1000);
    mockRecord.mockImplementationOnce(() => {
      if (failure === 'throw') {
        throw new Error('resume failed');
      }
      return undefined;
    });
    document.dispatchEvent(new Event('pointerdown'));
    await flush();
    expect(events('resumed')).toHaveLength(0);
    document.dispatchEvent(new Event('pointerdown'));
    await flush();
    expect(events('resumed')).toHaveLength(1);
    emit(metaEvent());
    expect(recordings()[1]).toMatchObject({ recording_id: id, seq: '1', gen: '1' });
  });

  it('pauses even when metadata capture fails and retries resume once capture recovers', async () => {
    await start({ inactivityThresholdMs: 1000 });
    const fail = () => {
      throw new Error('capture failed');
    };
    sdk.metas.addCaptureListener!(fail);
    await jest.advanceTimersByTimeAsync(1000);
    expect(attempts[0]!.stop).toHaveBeenCalledTimes(1);
    expect(events('paused')).toHaveLength(0);
    sdk.metas.removeCaptureListener!(fail);
    document.dispatchEvent(new Event('pointerdown'));
    await flush();
    expect(events('resumed')).toHaveLength(1);
  });

  it.each([0, undefined])('does not pause when inactivity tracking is disabled: %s', async (threshold) => {
    await start({ inactivityThresholdMs: threshold });
    await jest.advanceTimersByTimeAsync(120_000);
    expect(attempts[0]!.stop).not.toHaveBeenCalled();
  });

  it('refreshes the inactivity deadline on interaction', async () => {
    await start({ inactivityThresholdMs: 1000 });
    await jest.advanceTimersByTimeAsync(900);
    document.dispatchEvent(new Event('scroll'));
    await jest.advanceTimersByTimeAsync(900);
    expect(attempts[0]!.stop).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(100);
    expect(attempts[0]!.stop).toHaveBeenCalledTimes(1);
  });

  it('continues a completed same-document replacement without per-event checkpoint writes', async () => {
    const replay = await start();
    const writes = jest.spyOn(Storage.prototype, 'setItem');
    emit(metaEvent());
    emit(changeEvent());
    const id = recordings()[0]!['recording_id'];
    expect(writes).not.toHaveBeenCalled();
    sdk.instrumentations.remove(replay);
    await flush();
    expect(JSON.parse(window.sessionStorage.getItem(key)!)).toMatchObject({
      recordingId: id,
      handoff: 'clean',
      nextSeq: 2,
    });
    await start();
    emit(metaEvent());
    expect(recordings()[2]).toMatchObject({ recording_id: id, seq: '2', gen: '1' });
  });

  it('releases at pageswap, cancels departure work, and rereads the current checkpoint on restoration', async () => {
    await start();
    emit(metaEvent());
    const id = recordings()[0]!['recording_id'];
    window.dispatchEvent(new Event('pageswap'));
    expect(JSON.parse(window.sessionStorage.getItem(key)!).handoff).toBe('clean');
    window.dispatchEvent(new Event('pagehide'));
    document.dispatchEvent(new Event('freeze'));
    await flush();
    expect(attempts[0]!.stop).toHaveBeenCalledTimes(1);
    expect((await navigator.locks.query()).held).toEqual([]);
    const updated = { ...JSON.parse(window.sessionStorage.getItem(key)!), nextSeq: 30, gen: 5, documentId: 'outgoing' };
    window.sessionStorage.setItem(key, JSON.stringify(updated));
    document.dispatchEvent(new Event('resume'));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    await flush();
    expect(mockRecord).toHaveBeenCalledTimes(2);
    emit(metaEvent());
    expect(recordings()[1]).toMatchObject({ recording_id: id, seq: '30', gen: '6' });
  });

  it('does not release a lease for background visibility alone', async () => {
    await start();
    jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(attempts[0]!.stop).not.toHaveBeenCalled();
    expect((await navigator.locks.query()).held).toHaveLength(1);
  });

  it('does not infer an abandoned navigation from synthetic input or a navigation error', async () => {
    await start();
    window.dispatchEvent(new Event('pageswap'));
    document.dispatchEvent(new Event('pointerdown'));
    window.dispatchEvent(new Event('navigateerror'));
    await flush();
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect((await navigator.locks.query()).held).toEqual([]);
  });

  it('coalesces session rotations and rejects callbacks from the old attempt', async () => {
    await start();
    emit(metaEvent());
    const first = recordings()[0]!['recording_id'];
    setSession('B');
    setSession('C');
    await flush();
    emit(changeEvent('stale'), 0);
    emit(metaEvent());
    expect(mockRecord).toHaveBeenCalledTimes(2);
    expect(events('event').map((item) => item.meta.session?.id)).toEqual(['A', 'C']);
    expect(recordings()[1]!['recording_id']).not.toBe(first);
    expect(recordings()[1]).toMatchObject({ seq: '0', gen: '0' });
  });

  it('preserves identity when sampling is disabled and enabled in the same session', async () => {
    await start();
    emit(metaEvent());
    const id = recordings()[0]!['recording_id'];
    setSession('A', false);
    await flush();
    setSession('A');
    await flush();
    emit(metaEvent());
    expect(recordings()[1]).toMatchObject({ recording_id: id, seq: '1', gen: '1' });
  });

  it.each(['initial', 'rotated'])(
    'retries %s startup on interaction after a one-time capture failure',
    async (phase) => {
      if (phase === 'rotated') {
        await start();
      }
      const fail = () => {
        throw new Error('capture failed');
      };
      sdk.metas.addCaptureListener!(fail);
      if (phase === 'initial') {
        await start();
      } else {
        setSession('B');
        await flush();
      }
      const starts = mockRecord.mock.calls.length;
      await jest.advanceTimersByTimeAsync(10_000);
      expect(mockRecord).toHaveBeenCalledTimes(starts);
      sdk.metas.removeCaptureListener!(fail);
      document.dispatchEvent(new Event('pointerdown'));
      document.dispatchEvent(new Event('keydown'));
      await flush();
      expect(mockRecord).toHaveBeenCalledTimes(starts + 1);
      expect(events('started').at(-1)!.meta.session?.id).toBe(phase === 'initial' ? 'A' : 'B');
    }
  );

  it('never retries a removed initialization from its queued callbacks', async () => {
    const replay = await start();
    setSession('B');
    sdk.instrumentations.remove(replay);
    sdk.instrumentations.add(replay);
    await flush();
    expect(mockRecord).toHaveBeenCalledTimes(2);
    expect(attempts[0]!.stop).toHaveBeenCalledTimes(1);
  });

  it('rejects a conflicting producer without disturbing the existing recorder', async () => {
    await start();
    const other = initializeFaro(mockConfig());
    other.api.setSession({ id: 'other', attributes: { isSampled: 'true' } });
    await expect(start({}, other)).rejects.toThrow('already has a Replay producer');
    emit(metaEvent());
    expect(recordings()).toHaveLength(1);
    expect(attempts[0]!.stop).not.toHaveBeenCalled();
  });

  it('releases registration when configuration assembly fails', async () => {
    Object.defineProperty(sdk.config.app, 'name', {
      configurable: true,
      get: () => {
        throw new Error('invalid config');
      },
    });
    await expect(start()).rejects.toThrow('invalid config');
    const other = initializeFaro(mockConfig());
    other.api.setSession({ id: 'other', attributes: { isSampled: 'true' } });
    await expect(start({}, other)).resolves.toBeInstanceOf(ReplayInstrumentation);
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });

  it.each([
    [1, 'session-1', true],
    [0, 'session-1', false],
    [0.2, 'session-1', true],
    [0.1, 'session-1', false],
    [0.5, 'session-100', false],
    [-1, 'session-1', false],
    [2, 'session-1', true],
  ] as const)(
    'keeps the deterministic sampling decision at rate %s for %s',
    async (samplingRate, sessionId, expected) => {
      setSession(sessionId);
      const replay = await start({ samplingRate });
      expect(mockRecord).toHaveBeenCalledTimes(expected ? 1 : 0);
      sdk.instrumentations.remove(replay);
      await flush();
      await start({ samplingRate });
      expect(mockRecord).toHaveBeenCalledTimes(expected ? 2 : 0);
    }
  );

  it('waits for session initialization and stops after a completed clear', async () => {
    sdk.api.resetSession();
    await start();
    expect(mockRecord).not.toHaveBeenCalled();
    setSession('A');
    await flush();
    expect(mockRecord).toHaveBeenCalledTimes(1);
    sdk.api.resetSession();
    await flush();
    expect(attempts[0]!.stop).toHaveBeenCalledTimes(1);
  });

  it('passes privacy options and guards the custom input masker', async () => {
    const maskInputFn = jest.fn(() => 'custom');
    await start({
      maskAllInputs: false,
      maskInputOptions: { password: true, email: true },
      maskInputFn,
      maskTextSelector: '.private',
      blockSelector: '.blocked',
      ignoreSelector: '.ignored',
      collectFonts: true,
      inlineImages: true,
      inlineStylesheet: true,
      recordCanvas: true,
      recordCrossOriginIframes: true,
      recordAfter: 'DOMContentLoaded',
    });
    expect(attempts[0]!.options).toMatchObject({
      maskAllInputs: false,
      maskInputOptions: { password: true, email: true },
      maskTextSelector: '.private',
      blockSelector: '.blocked',
      ignoreSelector: '.ignored',
      maskTextClass: 'grafana-mask',
      blockClass: 'grafana-block',
      ignoreClass: 'grafana-ignore',
      collectFonts: true,
      inlineImages: true,
      inlineStylesheet: true,
      recordCanvas: true,
      recordCrossOriginIframes: true,
      recordAfter: 'DOMContentLoaded',
    });
    expect(attempts[0]!.options.maskInputFn!('private', document.createElement('input'))).toBe('custom');
    expect(maskInputFn).toHaveBeenCalledTimes(1);
  });

  it('uses fixed-length masking by default, including an explicitly undefined masker', async () => {
    await start({ maskInputFn: undefined });
    const mask = attempts[0]!.options.maskInputFn!;
    const input = document.createElement('input');
    expect([mask('short', input), mask('a much longer secret', input), mask('', input)]).toEqual([
      '******',
      '******',
      '',
    ]);
    expect(defaultMaskInputFn('', input)).toBe('');
  });

  it('sanitizes Meta URLs both before and after the Replay filter', async () => {
    const beforeSend = jest.fn((event: eventWithTime) =>
      event.type === EventType.Meta
        ? { ...event, data: { ...event.data, href: 'https://other:secret@example.net/new?q=private#token' } }
        : event
    );
    await start({ beforeSend });
    emit(metaEvent());
    expect((beforeSend.mock.calls[0]![0] as ReturnType<typeof metaEvent>).data).toMatchObject({
      href: 'https://example.com/path',
    });
    expect(JSON.parse(recordings()[0]!['event']!).data.href).toBe('https://example.net/new');
  });

  it.each(['not a URL', 'file:///some/path'])('preserves harmless or malformed Meta hrefs: %s', async (href) => {
    await start();
    emit(metaEvent(href));
    expect(JSON.parse(recordings()[0]!['event']!).data.href).toBe(href);
  });

  it('allows explicit URL sanitation opt-out', async () => {
    await start({ sanitizeMetaHref: false });
    const href = 'https://example.com/?token=private#secret';
    emit(metaEvent(href));
    expect(JSON.parse(recordings()[0]!['event']!).data.href).toBe(href);
  });
});
