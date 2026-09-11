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
    jest.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
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

  afterEach(() => {
    removeRecorders.forEach((remove) => remove());
    jest.restoreAllMocks();
  });

  function startOwner(app: MetaApp) {
    const faro = initializeFaro(mockConfig({ app, globalObjectKey: 'shared-faro' }));
    faro.api.setSession({ id: 'shared-session', attributes: { isSampled: 'true' } });
    const pushEvent = jest.spyOn(faro.api, 'pushEvent');
    const instrumentation = new ReplayInstrumentation();
    const remove = () => faro.instrumentations.remove(instrumentation);
    removeRecorders.push(remove);
    faro.instrumentations.add(instrumentation);

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
  ])('preserves A through an intervening B replacement (%j, %j)', (appA, appB) => {
    const firstA = startOwner(appA);
    firstA.remove();

    const ownerB = startOwner(appB);
    expect(ownerB.attributes['recording_id']).not.toBe(firstA.attributes['recording_id']);
    ownerB.remove();

    const nextA = startOwner(appA);
    expect(nextA.attributes).toEqual(
      expect.objectContaining({ recording_id: firstA.attributes['recording_id'], gen: '1', seq: '1' })
    );
  });

  it('preserves clean navigation handoffs across application releases without admitting another app', () => {
    const firstA = startOwner({ name: 'navigation-a', version: '1.0.0', release: 'first' });
    window.dispatchEvent(new Event('pagehide'));
    firstA.remove();

    const ownerB = startOwner({ name: 'navigation-b', version: '1.0.0', release: 'first' });
    expect(ownerB.attributes['recording_id']).not.toBe(firstA.attributes['recording_id']);
    window.dispatchEvent(new Event('pagehide'));
    ownerB.remove();

    const nextA = startOwner({ name: 'navigation-a', version: '2.0.0', release: 'second' });
    expect(nextA.attributes).toEqual(
      expect.objectContaining({ recording_id: firstA.attributes['recording_id'], gen: '1', seq: '1' })
    );
  });

  it('keeps concurrently recording owners isolated through a shared navigation', () => {
    const firstA = startOwner({ name: 'concurrent-a' });
    const firstB = startOwner({ name: 'concurrent-b' });
    expect(firstB.attributes['recording_id']).not.toBe(firstA.attributes['recording_id']);

    window.dispatchEvent(new Event('pagehide'));
    firstA.remove();
    firstB.remove();

    const nextB = startOwner({ name: 'concurrent-b' });
    const nextA = startOwner({ name: 'concurrent-a' });
    expect(nextA.attributes).toEqual(
      expect.objectContaining({ recording_id: firstA.attributes['recording_id'], gen: '1', seq: '1' })
    );
    expect(nextB.attributes).toEqual(
      expect.objectContaining({ recording_id: firstB.attributes['recording_id'], gen: '1', seq: '1' })
    );
  });
});
