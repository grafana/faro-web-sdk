import { type Faro, initializeFaro, type TransportBody } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { makeCoreConfig } from '../../../packages/web-sdk/src/config/makeCoreConfig';
import { SessionInstrumentation } from '../../../packages/web-sdk/src/instrumentations/session/instrumentation';
import {
  SESSION_EXPIRATION_TIME,
  SESSION_INACTIVITY_TIME,
  STORAGE_KEY,
} from '../../../packages/web-sdk/src/instrumentations/session/sessionManager';
import { FetchTransport } from '../../../packages/web-sdk/src/transports/fetch/transport';

import { ReplayInstrumentation } from './instrumentation';

describe.each([true, false])('Replay through Fetch with persistent=%s', (persistent) => {
  const originalFetch = globalThis.fetch;
  let replay: ReplayInstrumentation;
  let sdk: Faro;
  let requests: Array<{ sessionId: string; body: TransportBody }>;

  beforeEach(() => {
    jest.useFakeTimers();
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    requests = [];
    globalThis.fetch = jest.fn(async (_url, init) => {
      requests.push({
        sessionId: (init!.headers as Record<string, string>)['x-faro-session-id']!,
        body: JSON.parse(init!.body as string),
      });
      return { status: 202, headers: { get: () => null }, text: async () => '' } as unknown as Response;
    });
  });

  afterEach(async () => {
    window.dispatchEvent(new Event('pagehide'));
    sdk.instrumentations.remove(...sdk.instrumentations.instrumentations);
    sdk.transports.remove(...sdk.transports.transports);
    await jest.advanceTimersByTimeAsync(0);
    jest.clearAllTimers();
    jest.useRealTimers();
    globalThis.fetch = originalFetch;
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  function start(inactivityThresholdMs: number) {
    replay = new ReplayInstrumentation({ recordAfter: 'DOMContentLoaded', inactivityThresholdMs });
    sdk = initializeFaro(
      makeCoreConfig(
        mockConfig({
          batching: {},
          instrumentations: [new SessionInstrumentation(), replay],
          sessionTracking: { enabled: true, persistent, samplingRate: 1 },
          transports: [new FetchTransport({ url: 'https://collector.test/collect', requestTimeoutMs: 0 })],
        })
      )!
    );
    return sdk;
  }

  async function flush() {
    await jest.advanceTimersByTimeAsync(250);
  }

  function recordings() {
    return requests.flatMap(({ body }) =>
      (body.events ?? [])
        .filter((event) => event.name === 'faro.session_recording.event')
        .map((event) => ({ sessionId: body.meta.session?.id, attributes: event.attributes! }))
    );
  }

  function expectConsistentOwnership() {
    expect(requests.every(({ sessionId, body }) => sessionId === body.meta.session?.id)).toBe(true);
    const owners = new Map<string, string | undefined>();
    for (const { sessionId, attributes } of recordings()) {
      const recordingId = attributes['recording_id']!;
      if (owners.has(recordingId)) {
        expect(sessionId).toBe(owners.get(recordingId));
      } else {
        owners.set(recordingId, sessionId);
      }
    }
    expect(owners.size).toBe(2);
  }

  it('starts a new recording before resuming an expired session', async () => {
    const faro = start(1000);
    const sessionA = faro.api.getSession()?.id;
    await flush();
    const recordingA = recordings()[0]!.attributes['recording_id'];
    await jest.advanceTimersByTimeAsync(1000);
    await flush();
    jest.setSystemTime(Date.now() + SESSION_INACTIVITY_TIME + 1);
    document.dispatchEvent(new Event('pointerdown'));
    await flush();

    const sessionB = faro.api.getSession()?.id;
    expect(sessionB).not.toBe(sessionA);
    expect(
      recordings()
        .filter((event) => event.sessionId === sessionB)
        .map((event) => event.attributes['seq'])
    ).toEqual(['0', '1']);
    expect(
      recordings()
        .filter((event) => event.sessionId === sessionB)
        .every((event) => event.attributes['recording_id'] !== recordingA)
    ).toBe(true);
    expectConsistentOwnership();
  });

  it('does not move queued incremental events at a lifetime boundary', async () => {
    const faro = start(0);
    await flush();
    const sessionA = faro.api.getSession()?.id;
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 11 }));
    const storage = persistent ? window.localStorage : window.sessionStorage;
    const stored = JSON.parse(storage.getItem(STORAGE_KEY)!);
    jest.setSystemTime(stored.started + SESSION_EXPIRATION_TIME + 1);
    stored.lastActivity = Date.now();
    storage.setItem(STORAGE_KEY, JSON.stringify(stored));
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 22 }));
    await flush();

    expect(faro.api.getSession()?.id).not.toBe(sessionA);
    const before = recordings().find((event) => JSON.parse(event.attributes['event']!).data?.x === 11);
    expect(before?.sessionId).toBe(sessionA);
    expectConsistentOwnership();
  });

  it('ignores a delayed session-invalid response for a rotated-away session and keeps the new recording', async () => {
    // Hold the first request so the collector can answer it after the session has rotated.
    let held: { sessionId: string; resolve: (response: Response) => void } | undefined;
    globalThis.fetch = jest.fn((_url, init) => {
      const sessionId = (init!.headers as Record<string, string>)['x-faro-session-id']!;
      requests.push({ sessionId, body: JSON.parse(init!.body as string) });
      if (!held) {
        return new Promise<Response>((resolve) => (held = { sessionId, resolve }));
      }
      return Promise.resolve({
        status: 202,
        headers: { get: () => null },
        text: async () => '',
      } as unknown as Response);
    });

    const faro = start(1000);
    const sessionA = faro.api.getSession()!.id;
    await flush();
    expect(held?.sessionId).toBe(sessionA);

    await jest.advanceTimersByTimeAsync(1000);
    jest.setSystemTime(Date.now() + SESSION_INACTIVITY_TIME + 1);
    document.dispatchEvent(new Event('pointerdown'));
    await flush();
    const sessionB = faro.api.getSession()!.id;
    expect(sessionB).not.toBe(sessionA);
    const recordingB = recordings().find((event) => event.sessionId === sessionB)!.attributes['recording_id'];

    held!.resolve({
      status: 202,
      headers: { get: (name: string) => (name === 'X-Faro-Session-Status' ? 'invalid' : null) },
      text: async () => '',
    } as unknown as Response);
    await flush();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 5 }));
    await flush();

    expect(faro.api.getSession()!.id).toBe(sessionB);
    const underB = recordings().filter((event) => event.sessionId === sessionB);
    expect(underB.length).toBeGreaterThan(2);
    expect(underB.every((event) => event.attributes['recording_id'] === recordingB)).toBe(true);
    expect(underB.map((event) => event.attributes['seq'])).toEqual(underB.map((_, index) => String(index)));
    expectConsistentOwnership();
  });
});
