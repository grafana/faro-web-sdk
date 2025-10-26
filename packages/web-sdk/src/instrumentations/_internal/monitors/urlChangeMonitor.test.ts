import { MESSAGE_TYPE_URL_CHANGE, monitorUrlChanges, __resetUrlChangeMonitorForTests } from './urlChangeMonitor';

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
});


