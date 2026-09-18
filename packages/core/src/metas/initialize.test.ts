import { initializeFaro } from '../initialize';
import { mockConfig, MockTransport } from '../testUtils';

import { captureMetas } from './capture';
import type { Metas } from './types';

describe('metas', () => {
  it('supports the pre-capture public Metas interface and runs scoped callbacks', () => {
    const metas: Metas = {
      add: () => {},
      remove: () => {},
      addListener: () => {},
      removeListener: () => {},
      value: { session: { id: 'before' } },
    };

    const captured = captureMetas(metas, () => {
      metas.value = { session: { id: 'after' } };
    });

    expect(captured.session?.id).toBe('before');
    expect(metas.value.session?.id).toBe('after');
  });

  it('sets app.gitHash from global object on initialization', () => {
    (global as any).__faroGitHash_test = 'abc123def456abc123def456abc123def456abc1';

    const { metas } = initializeFaro(mockConfig());
    expect(metas.value.app?.gitHash).toEqual('abc123def456abc123def456abc123def456abc1');

    delete (global as any).__faroGitHash_test;
  });

  it('leaves app.gitHash undefined when global is not set', () => {
    delete (global as any).__faroGitHash_test;

    const { metas } = initializeFaro(mockConfig());
    expect(metas.value.app?.gitHash).toBeUndefined();
  });

  it('preserves config.app.gitHash when global __faroGitHash is absent', () => {
    delete (global as any).__faroGitHash_test;

    const { metas } = initializeFaro(
      mockConfig({ app: { name: 'test', version: '1.0.0', gitHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' } })
    );
    expect(metas.value.app?.gitHash).toEqual('deadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
  });

  it('can set listeners and they will be notified on meta changes', () => {
    const { metas } = initializeFaro(mockConfig());

    const listener = jest.fn(() => {});
    metas.addListener(listener);

    metas.add({ user: { id: 'foo' } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(metas.value);

    metas.add({ session: { id: '1' } });
    expect(listener).toHaveBeenCalledTimes(2);
    metas.removeListener(listener);

    metas.add({ session: { id: '2' } });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('reconciles capture without making reads active or recursively capturing lifecycle events', () => {
    const transport = new MockTransport();
    const { api, metas } = initializeFaro(mockConfig({ transports: [transport] }));
    api.setSession({ id: 'old' });
    const reconcile = () => {
      api.setSession({ id: 'new' });
      api.pushEvent('session-transition');
    };
    metas.addCaptureListener!(reconcile);

    expect(api.getSession()?.id).toBe('old');
    api.pushEvent('activity');
    expect(transport.items.map((item) => item.meta.session?.id)).toEqual(['new', 'new']);

    metas.removeCaptureListener!(reconcile);
    api.setSession({ id: 'later' });
    api.pushEvent('next-activity');
    expect(transport.items[2]?.meta.session?.id).toBe('later');
    expect(transport.items[0]?.meta.session?.id).toBe('new');
  });

  it('reconciles pending listeners before telemetry emitted by an earlier listener is captured', () => {
    const transport = new MockTransport();
    const { api, metas } = initializeFaro(mockConfig({ transports: [transport] }));
    api.setSession({ id: 'old' });
    const emit = jest.fn(() => api.pushEvent('listener-event'));
    let session = 0;
    const reconcile = jest.fn(() => {
      api.setSession({ id: String(++session) });
      api.pushEvent('session-transition');
    });
    metas.addCaptureListener!(emit);
    metas.addCaptureListener!(reconcile);

    metas.capture!(() => api.pushEvent('callback-event'));
    expect(transport.items.map((item) => item.meta.session?.id)).toEqual(['1', '1', '1']);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledTimes(1);

    api.pushEvent('next-activity');
    expect(transport.items.map((item) => item.meta.session?.id)).toEqual(['1', '1', '1', '2', '2', '2']);
    expect(emit).toHaveBeenCalledTimes(2);
    expect(reconcile).toHaveBeenCalledTimes(2);
  });

  it('defers capture listener additions and removals until the next cycle during nested capture', () => {
    const { api, metas } = initializeFaro(mockConfig());
    const replacement = () => api.setSession({ id: 'replacement' });
    const pending = () => api.setSession({ id: 'pending' });
    const mutate = () => {
      metas.addCaptureListener!(replacement);
      metas.removeCaptureListener!(pending);
      metas.removeCaptureListener!(mutate);
      expect(metas.capture!().session?.id).toBe('pending');
    };
    metas.addCaptureListener!(mutate);
    metas.addCaptureListener!(pending);

    expect(metas.capture!().session?.id).toBe('pending');
    expect(metas.capture!().session?.id).toBe('replacement');
  });

  it('keeps nested submissions in one capture while subsequent activity can rotate', () => {
    const transport = new MockTransport();
    const { api, metas } = initializeFaro(mockConfig({ transports: [transport] }));
    let session = 0;
    metas.addCaptureListener!(() => api.setSession({ id: String(++session) }));

    metas.capture!(() => {
      api.pushEvent('first');
      api.pushEvent('second');
    });
    api.pushEvent('next');
    expect(transport.items.map((item) => item.meta.session?.id)).toEqual(['1', '1', '2']);
  });

  it('allows subsequent captures after a reconciliation listener throws', () => {
    const { api, metas } = initializeFaro(mockConfig());
    const fail = () => {
      throw new Error('reconciliation failed');
    };
    metas.addCaptureListener!(fail);
    expect(() => metas.capture!()).toThrow('reconciliation failed');
    metas.removeCaptureListener!(fail);
    metas.addCaptureListener!(() => api.setSession({ id: 'recovered' }));
    expect(metas.capture!().session?.id).toBe('recovered');
  });

  it('resets the capture cycle after a pending listener throws during nested capture', () => {
    const { api, metas } = initializeFaro(mockConfig());
    const nested = jest.fn(() => metas.capture!());
    const fail = () => {
      throw new Error('nested reconciliation failed');
    };
    metas.addCaptureListener!(nested);
    metas.addCaptureListener!(fail);

    expect(() => metas.capture!()).toThrow('nested reconciliation failed');
    metas.removeCaptureListener!(fail);
    metas.addCaptureListener!(() => api.setSession({ id: 'recovered' }));

    expect(metas.capture!().session?.id).toBe('recovered');
    expect(nested).toHaveBeenCalledTimes(2);
    expect(nested).toHaveLastReturnedWith(expect.objectContaining({ session: { id: 'recovered' } }));
  });
});
