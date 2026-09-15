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

  it.each([false, true])(
    'snapshots a reused legacy metadata object without marking it captured (capture=%s)',
    (customCapture) => {
      const live = { session: { id: 'first' } };
      const metas = { value: live, capture: customCapture ? () => live : undefined };
      const first = captureMetas(metas);
      live.session = { id: 'second' };
      const second = captureMetas(metas);

      expect(first).not.toBe(live);
      expect(second).not.toBe(live);
      expect(first.session?.id).toBe('first');
      expect(second.session?.id).toBe('second');
    }
  );

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

  it('retains a reconciliation failure swallowed by nested telemetry until the outer capture exits', () => {
    const transport = new MockTransport();
    const { api, metas } = initializeFaro(mockConfig({ transports: [transport], dedupe: true }));
    const fail = () => {
      throw new Error('nested failure');
    };
    const remaining = jest.fn();
    metas.addCaptureListener!(() => api.pushEvent('nested'));
    metas.addCaptureListener!(fail);
    metas.addCaptureListener!(remaining);

    api.pushEvent('outer');

    expect(transport.items).toEqual([]);
    expect(remaining).not.toHaveBeenCalled();

    metas.removeCaptureListener!(fail);
    api.pushEvent('outer');
    expect(transport.items.map((item) => (item.payload as { name: string }).name)).toEqual(['nested', 'outer']);
    expect(remaining).toHaveBeenCalledTimes(1);
  });

  it('retains metadata assembly failure after a nested public API catches it', () => {
    const transport = new MockTransport();
    const { api, metas } = initializeFaro(mockConfig({ transports: [transport] }));
    let fail = true;
    metas.add(() => {
      if (fail) {
        fail = false;
        throw new Error('metadata assembly failed');
      }
      return {};
    });
    metas.addCaptureListener!(() => api.pushEvent('nested'));

    expect(() => metas.capture!(() => api.pushEvent('outer'))).toThrow('metadata assembly failed');
    expect(transport.items).toEqual([]);

    api.pushEvent('recovered');
    expect(transport.items.map((item) => (item.payload as { name: string }).name)).toEqual(['nested', 'recovered']);
  });

  it('does not deliver a metadata listener when assembly triggers a caught capture failure', () => {
    const { api, metas } = initializeFaro(mockConfig());
    let submit = true;
    metas.add(() => {
      if (submit) {
        submit = false;
        api.pushEvent('nested');
      }
      return {};
    });
    const delivered = jest.fn();
    metas.addListener(delivered);
    metas.addCaptureListener!(() => api.setSession({ id: 'replacement' }));
    metas.addCaptureListener!(() => {
      throw new Error('capture failed');
    });

    api.pushEvent('outer');

    expect(delivered).not.toHaveBeenCalled();
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
