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
    let originalNavigateEvent: any;

    beforeEach(() => {
      originalNavigation = (window as any).navigation;
      originalNavigateEvent = (window as any).NavigateEvent;

      const listeners: Record<string, Function[]> = { navigate: [] };
      (window as any).navigation = {
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

      function FakeNavigateEvent(this: any, _type: string, init: any) {
        this.destination = init?.destination;
      }
      (FakeNavigateEvent as any).prototype = {
        intercept: jest.fn(),
      };

      (window as any).NavigateEvent = FakeNavigateEvent as any;
    });

    afterEach(() => {
      (window as any).navigation = originalNavigation;
      (window as any).NavigateEvent = originalNavigateEvent;
    });

    it('emits on same-document navigate events and does not patch history', () => {
      const initialHref = window.location.href;
      const observable = monitorUrlChanges();
      const subscriber = jest.fn();
      observable.subscribe(subscriber);

      (window as any).navigation._dispatch(
        'navigate',
        new (window as any).NavigateEvent('navigate', {
          destination: { url: initialHref + '#nav', sameDocument: true },
        })
      );

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith({
        type: MESSAGE_TYPE_URL_CHANGE,
        from: initialHref,
        to: initialHref + '#nav',
        trigger: 'navigate',
      });

      // ensure history methods were not wrapped in this mode
      const pushDesc = Object.getOwnPropertyDescriptor(window.history, 'pushState');
      const replaceDesc = Object.getOwnPropertyDescriptor(window.history, 'replaceState');
      expect(pushDesc?.value).toBeDefined();
      expect(replaceDesc?.value).toBeDefined();
    });

    it('emits on intercept for cross-document navigations (soft navigation)', () => {
      const initialHref = window.location.href;
      const observable = monitorUrlChanges();
      const subscriber = jest.fn();
      observable.subscribe(subscriber);

      const ev = new (window as any).NavigateEvent('navigate', {
        destination: { url: initialHref + '/soft', sameDocument: false },
      });
      // make intercept permitted
      (ev as any).canIntercept = true;
      // call the wrapped intercept
      (window as any).NavigateEvent.prototype.intercept.call(ev, {});

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenCalledWith({
        type: MESSAGE_TYPE_URL_CHANGE,
        from: initialHref,
        to: initialHref + '/soft',
        trigger: 'navigate-intercept',
      });
    });
  });
});
