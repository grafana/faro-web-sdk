import { __resetUrlChangeMonitorForTests, MESSAGE_TYPE_URL_CHANGE, monitorUrlChanges } from './urlChangeMonitor';

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
      (window as any).navigation._dispatch('currententrychange', {});

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith({
        type: MESSAGE_TYPE_URL_CHANGE,
        from: initialHref,
        to: initialHref + '#nav',
        trigger: 'currententrychange',
      });

      // ensure history methods were not wrapped in this mode
      const pushDesc = Object.getOwnPropertyDescriptor(window.history, 'pushState');
      const replaceDesc = Object.getOwnPropertyDescriptor(window.history, 'replaceState');
      expect(pushDesc?.value).toBeDefined();
      expect(replaceDesc?.value).toBeDefined();
    });

    it('does not emit on navigate events before navigation commits', () => {
      const initialHref = window.location.href;
      const observable = monitorUrlChanges();
      const subscriber = jest.fn();
      observable.subscribe(subscriber);

      (window as any).navigation._dispatch('navigate', {
        destination: { url: initialHref + '/pending', sameDocument: true },
      });

      expect(subscriber).not.toHaveBeenCalled();
    });

    it('emits on committed soft navigations', () => {
      const initialHref = window.location.href;
      const observable = monitorUrlChanges();
      const subscriber = jest.fn();
      observable.subscribe(subscriber);

      (window as any).navigation.currentEntry = { url: initialHref + '/soft' };
      (window as any).navigation._dispatch('currententrychange', {});

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith({
        type: MESSAGE_TYPE_URL_CHANGE,
        from: initialHref,
        to: initialHref + '/soft',
        trigger: 'currententrychange',
      });
    });
  });
});
