import {
  __resetUrlChangeMonitorForTests,
  MESSAGE_TYPE_NAVIGATION_TRANSITION_END,
  MESSAGE_TYPE_NAVIGATION_TRANSITION_START,
  MESSAGE_TYPE_URL_CHANGE,
  monitorNavigationTransitions,
  monitorUrlChanges,
} from './urlChangeMonitor';

describe('monitorUrlChanges', () => {
  afterEach(() => {
    __resetUrlChangeMonitorForTests();
    jest.resetAllMocks();
  });

  it('notifies when history.pushState changes the URL', () => {
    const initialHref = window.location.href;
    const observable = monitorUrlChanges();
    const subscriber = jest.fn();
    observable.subscribe(subscriber);

    window.history.pushState({}, '', '/test-push');

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith({
      type: MESSAGE_TYPE_URL_CHANGE,
      from: initialHref,
      to: window.location.href,
      trigger: 'pushState',
    });
  });

  it('notifies on hash changes', () => {
    const initialHref = window.location.href;
    const observable = monitorUrlChanges();
    const subscriber = jest.fn();
    observable.subscribe(subscriber);

    window.location.hash = 'hash-change';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith({
      type: MESSAGE_TYPE_URL_CHANGE,
      from: initialHref,
      to: window.location.href,
      trigger: 'hashchange',
    });
  });

  it('returns the same observable on subsequent calls and instruments once', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const pushStateSpy = jest.spyOn(window.history, 'pushState');
    const replaceStateSpy = jest.spyOn(window.history, 'replaceState');

    const first = monitorUrlChanges();
    const second = monitorUrlChanges();

    expect(second).toBe(first);

    // Ensure addEventListener only called once for popstate and hashchange
    const popstateCalls = addEventListenerSpy.mock.calls.filter((c) => c[0] === 'popstate');
    const hashchangeCalls = addEventListenerSpy.mock.calls.filter((c) => c[0] === 'hashchange');
    expect(popstateCalls.length).toBe(1);
    expect(hashchangeCalls.length).toBe(1);

    // Ensure pushState/replaceState were redefined once (spies see wrapper calls after redefinition)
    window.history.pushState({}, '', '/x');
    window.history.replaceState({}, '', '/y');
    expect(pushStateSpy).toHaveBeenCalled();
    expect(replaceStateSpy).toHaveBeenCalled();

    // The monitor captured the spies as the originals, so reset it before restoring them. Otherwise the reset in
    // afterEach puts the spies back on window.history, and resetAllMocks turns them into no-ops for later tests.
    __resetUrlChangeMonitorForTests();
    addEventListenerSpy.mockRestore();
    pushStateSpy.mockRestore();
    replaceStateSpy.mockRestore();
  });

  describe('with Navigation API', () => {
    let originalNavigation: any;

    beforeEach(() => {
      originalNavigation = (window as any).navigation;

      const listeners: Record<string, Function[]> = { currententrychange: [], navigate: [] };
      (window as any).navigation = {
        currentEntry: { url: window.location.href },
        addEventListener: (type: string, cb: Function) => listeners[type]?.push(cb),
        removeEventListener: (type: string, cb: Function) => {
          const arr = listeners[type];
          if (!arr) {
            return;
          }
          const idx = arr.indexOf(cb);
          if (idx >= 0) {
            arr.splice(idx, 1);
          }
        },
        _dispatch: (type: string, ev: any) => listeners[type]?.forEach((cb) => cb(ev)),
      };
    });

    afterEach(() => {
      (window as any).navigation = originalNavigation;
    });

    it('emits on currententrychange events and does not patch history', () => {
      const initialHref = window.location.href;
      const observable = monitorUrlChanges();
      const subscriber = jest.fn();
      observable.subscribe(subscriber);

      (window as any).navigation.currentEntry = { url: initialHref + '#nav' };
      (window as any).navigation._dispatch('currententrychange', {
        from: { url: initialHref },
        navigationType: 'push',
      });

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith({
        type: MESSAGE_TYPE_URL_CHANGE,
        from: initialHref,
        to: initialHref + '#nav',
        trigger: 'pushState',
      });

      // ensure history methods were not wrapped in this mode
      const pushDesc = Object.getOwnPropertyDescriptor(window.history, 'pushState');
      const replaceDesc = Object.getOwnPropertyDescriptor(window.history, 'replaceState');
      expect(pushDesc?.value).toBeDefined();
      expect(replaceDesc?.value).toBeDefined();
    });

    it('maps replace navigations to replaceState', () => {
      const initialHref = window.location.href;
      const observable = monitorUrlChanges();
      const subscriber = jest.fn();
      observable.subscribe(subscriber);

      (window as any).navigation.currentEntry = { url: initialHref + '/replace' };
      (window as any).navigation._dispatch('currententrychange', {
        from: { url: initialHref },
        navigationType: 'replace',
      });

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith({
        type: MESSAGE_TYPE_URL_CHANGE,
        from: initialHref,
        to: initialHref + '/replace',
        trigger: 'replaceState',
      });
    });

    it('does not emit reload navigations', () => {
      const initialHref = window.location.href;
      const observable = monitorUrlChanges();
      const subscriber = jest.fn();
      observable.subscribe(subscriber);

      (window as any).navigation.currentEntry = { url: initialHref + '/reload' };
      (window as any).navigation._dispatch('currententrychange', {
        from: { url: initialHref },
        navigationType: 'reload',
      });

      expect(subscriber).not.toHaveBeenCalled();
    });

    it('does not let uncommitted navigate events corrupt the next committed from URL', () => {
      const initialHref = window.location.href;
      const observable = monitorUrlChanges();
      const subscriber = jest.fn();
      observable.subscribe(subscriber);

      (window as any).navigation._dispatch('navigate', {
        destination: { url: initialHref + '/pending', sameDocument: true },
      });
      expect(subscriber).not.toHaveBeenCalled();

      // No `from` on the event, so the source URL comes from the monitor's own state
      (window as any).navigation.currentEntry = { url: initialHref + '/committed' };
      (window as any).navigation._dispatch('currententrychange', { navigationType: 'push' });

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith({
        type: MESSAGE_TYPE_URL_CHANGE,
        from: initialHref,
        to: initialHref + '/committed',
        trigger: 'pushState',
      });
    });

    it('emits once when a listener redirects while handling currententrychange', () => {
      const initialHref = window.location.href;
      const observable = monitorUrlChanges();
      const subscriber = jest.fn();
      observable.subscribe(subscriber);

      // A listener registered before ours redirects /first to /redirected, so ours sees the nested change
      // first and then the outer one, both with the redirected URL as the current entry
      (window as any).navigation.currentEntry = { url: initialHref + '/redirected' };
      (window as any).navigation._dispatch('currententrychange', {
        from: { url: initialHref + '/first' },
        navigationType: 'replace',
      });
      (window as any).navigation._dispatch('currententrychange', {
        from: { url: initialHref },
        navigationType: 'push',
      });

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith({
        type: MESSAGE_TYPE_URL_CHANGE,
        from: initialHref,
        to: initialHref + '/redirected',
        trigger: 'replaceState',
      });
    });

    it('falls back to history patching when there is no current entry', () => {
      // Opaque-origin documents have the Navigation API, but no current entry and no currententrychange events
      (window as any).navigation.currentEntry = null;
      const initialHref = window.location.href;
      const observable = monitorUrlChanges();
      const subscriber = jest.fn();
      observable.subscribe(subscriber);

      window.history.pushState({}, '', '/opaque-origin');

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith({
        type: MESSAGE_TYPE_URL_CHANGE,
        from: initialHref,
        to: window.location.href,
        trigger: 'pushState',
      });
    });

    it('emits on committed soft navigations', () => {
      const initialHref = window.location.href;
      const observable = monitorUrlChanges();
      const subscriber = jest.fn();
      observable.subscribe(subscriber);

      (window as any).navigation.currentEntry = { url: initialHref + '/soft' };
      (window as any).navigation._dispatch('currententrychange', {
        from: { url: initialHref },
        navigationType: 'traverse',
      });

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith({
        type: MESSAGE_TYPE_URL_CHANGE,
        from: initialHref,
        to: initialHref + '/soft',
        trigger: 'popstate',
      });
    });
  });
});

function createDeferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('monitorNavigationTransitions', () => {
  let originalNavigation: any;
  let navigation: any;

  beforeEach(() => {
    jest.useFakeTimers();
    originalNavigation = (window as any).navigation;

    const listeners: Record<string, Function[]> = { navigate: [] };
    navigation = {
      transition: null,
      addEventListener: jest.fn((type: string, cb: Function) => listeners[type]?.push(cb)),
      removeEventListener: (type: string, cb: Function) => {
        const arr = listeners[type];
        const idx = arr?.indexOf(cb) ?? -1;
        if (idx >= 0) {
          arr!.splice(idx, 1);
        }
      },
      _dispatch: (type: string) => listeners[type]?.forEach((cb) => cb({})),
    };
    (window as any).navigation = navigation;
  });

  afterEach(() => {
    __resetUrlChangeMonitorForTests();
    (window as any).navigation = originalNavigation;
    jest.useRealTimers();
  });

  it('emits start and end messages around a deferred commit', async () => {
    const observable = monitorNavigationTransitions();
    const subscriber = jest.fn();
    observable.subscribe(subscriber);

    const committed = createDeferred();
    navigation.transition = { committed: committed.promise };
    navigation._dispatch('navigate');

    expect(subscriber).not.toHaveBeenCalled();
    jest.runAllTimers();

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith({
      type: MESSAGE_TYPE_NAVIGATION_TRANSITION_START,
      transitionId: expect.any(String),
    });
    const { transitionId } = subscriber.mock.calls[0][0];

    committed.resolve();
    await Promise.resolve();

    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenLastCalledWith({ type: MESSAGE_TYPE_NAVIGATION_TRANSITION_END, transitionId });
  });

  it('emits the end message when the navigation fails before commit', async () => {
    const observable = monitorNavigationTransitions();
    const subscriber = jest.fn();
    observable.subscribe(subscriber);

    const committed = createDeferred();
    navigation.transition = { committed: committed.promise };
    navigation._dispatch('navigate');
    jest.runAllTimers();
    const { transitionId } = subscriber.mock.calls[0][0];

    committed.reject(new Error('aborted'));
    await Promise.resolve();

    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenLastCalledWith({ type: MESSAGE_TYPE_NAVIGATION_TRANSITION_END, transitionId });
  });

  it('checks for a transition only after the other navigate listeners have run', () => {
    const observable = monitorNavigationTransitions();
    const subscriber = jest.fn();
    observable.subscribe(subscriber);

    navigation._dispatch('navigate');
    // A router listener registered after ours intercepts the navigation
    navigation.transition = { committed: createDeferred().promise };
    jest.runAllTimers();

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith({
      type: MESSAGE_TYPE_NAVIGATION_TRANSITION_START,
      transitionId: expect.any(String),
    });
  });

  it('counts a transition once when the timer of an earlier navigation also sees it', () => {
    const observable = monitorNavigationTransitions();
    const subscriber = jest.fn();
    observable.subscribe(subscriber);

    // The first navigation finishes (or is aborted) before its timer runs, and a second one starts with a
    // deferred commit, so both timers see the second transition
    navigation._dispatch('navigate');
    navigation.transition = { committed: createDeferred().promise };
    navigation._dispatch('navigate');
    jest.runAllTimers();

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith({
      type: MESSAGE_TYPE_NAVIGATION_TRANSITION_START,
      transitionId: expect.any(String),
    });
  });

  it('ignores navigations that are not intercepted', () => {
    const observable = monitorNavigationTransitions();
    const subscriber = jest.fn();
    observable.subscribe(subscriber);

    navigation._dispatch('navigate');
    jest.runAllTimers();

    expect(subscriber).not.toHaveBeenCalled();
  });

  it('ignores transitions without a committed promise', () => {
    const observable = monitorNavigationTransitions();
    const subscriber = jest.fn();
    observable.subscribe(subscriber);

    navigation.transition = { finished: createDeferred().promise };
    navigation._dispatch('navigate');
    jest.runAllTimers();

    expect(subscriber).not.toHaveBeenCalled();
  });

  it('returns the same observable on subsequent calls and listens once', () => {
    const first = monitorNavigationTransitions();
    const second = monitorNavigationTransitions();

    expect(second).toBe(first);
    expect(navigation.addEventListener).toHaveBeenCalledTimes(1);
    expect(navigation.addEventListener).toHaveBeenCalledWith('navigate', expect.any(Function));
  });

  it('does not listen when the Navigation API is unavailable', () => {
    (window as any).navigation = undefined;

    expect(monitorNavigationTransitions()).toBeDefined();
    expect(navigation.addEventListener).not.toHaveBeenCalled();
  });
});
