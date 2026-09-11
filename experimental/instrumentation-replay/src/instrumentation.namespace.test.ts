import { initializeFaro, type MetaApp } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';
import { EventType, type eventWithTime } from '@grafana/rrweb-types';

import { ReplayInstrumentation } from './instrumentation';

jest.mock('@grafana/rrweb', () => {
  const record = Object.assign(jest.fn(), { takeFullSnapshot: jest.fn() });
  return { record };
});

describe('replay handoff owner namespace', () => {
  let removeRecorders: Array<() => void>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    removeRecorders = [];
    require('@grafana/rrweb').record.mockImplementation((options: { emit: (event: eventWithTime) => void }) => {
      options.emit({
        type: EventType.Meta,
        data: { href: 'https://example.com/', width: 1, height: 1 },
        timestamp: Date.now(),
      });
      return jest.fn();
    });
  });

  afterEach(async () => {
    window.dispatchEvent(new Event('pagehide'));
    removeRecorders.forEach((remove) => remove());
    await jest.advanceTimersByTimeAsync(0);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  async function startOwner(app: MetaApp, globalObjectKey = 'shared-faro') {
    const faro = initializeFaro(mockConfig({ app, globalObjectKey }));
    faro.api.setSession({ id: 'shared-session', attributes: { isSampled: 'true' } });
    const pushEvent = jest.spyOn(faro.api, 'pushEvent');
    const instrumentation = new ReplayInstrumentation();
    const remove = () => faro.instrumentations.remove(instrumentation);
    removeRecorders.push(remove);
    faro.instrumentations.add(instrumentation);
    await jest.advanceTimersByTimeAsync(0);

    const replay = pushEvent.mock.calls.find(([name]) => name === 'faro.session_recording.event');
    expect(replay).toBeDefined();
    return { attributes: replay![1]!, remove };
  }

  it.each([
    [{ name: 'app-a' }, { name: 'app-b' }],
    [
      { name: 'app', namespace: 'team-a' },
      { name: 'app', namespace: 'team-b' },
    ],
    [
      { name: 'app', environment: 'production' },
      { name: 'app', environment: 'staging' },
    ],
  ])('preserves A through an intervening B replacement (%j, %j)', async (appA, appB) => {
    const firstA = await startOwner(appA);
    firstA.remove();

    const ownerB = await startOwner(appB);
    expect(ownerB.attributes['recording_id']).not.toBe(firstA.attributes['recording_id']);
    ownerB.remove();

    const nextA = await startOwner(appA);
    expect(nextA.attributes).toEqual(
      expect.objectContaining({ recording_id: firstA.attributes['recording_id'], gen: '1', seq: '1' })
    );
  });

  it('preserves clean navigation handoffs across application releases without admitting another app', async () => {
    const firstA = await startOwner({ name: 'navigation-a', version: '1.0.0', release: 'first' });
    window.dispatchEvent(new Event('pagehide'));
    firstA.remove();
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));

    const ownerB = await startOwner({ name: 'navigation-b', version: '1.0.0', release: 'first' });
    expect(ownerB.attributes['recording_id']).not.toBe(firstA.attributes['recording_id']);
    window.dispatchEvent(new Event('pagehide'));
    ownerB.remove();
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));

    const nextA = await startOwner({ name: 'navigation-a', version: '2.0.0', release: 'second' });
    expect(nextA.attributes).toEqual(
      expect.objectContaining({ recording_id: firstA.attributes['recording_id'], gen: '1', seq: '1' })
    );
  });

  it('includes the global object key in the owner namespace', async () => {
    const firstA = await startOwner({ name: 'app' }, 'first');
    firstA.remove();
    const firstB = await startOwner({ name: 'app' }, 'second');
    expect(firstB.attributes['recording_id']).not.toBe(firstA.attributes['recording_id']);
    firstB.remove();
    const nextA = await startOwner({ name: 'app' }, 'first');
    expect(nextA.attributes).toEqual(
      expect.objectContaining({ recording_id: firstA.attributes['recording_id'], gen: '1', seq: '1' })
    );
  });

  it('rejects overlapping registrations even for different owners', async () => {
    const first = await startOwner({ name: 'first' });
    await expect(startOwner({ name: 'second' })).rejects.toThrow('already has a Replay producer');
    first.remove();
    await expect(startOwner({ name: 'second' })).resolves.toBeDefined();
  });
});
