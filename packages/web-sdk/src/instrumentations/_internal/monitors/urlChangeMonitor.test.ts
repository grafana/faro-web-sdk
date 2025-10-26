import { MESSAGE_TYPE_URL_CHANGE, monitorUrlChanges } from './urlChangeMonitor';

describe('monitorUrlChanges', () => {
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    // Restore original history methods to avoid bleeding state into other tests
    window.history.pushState = originalPushState;
    window.history.replaceState = originalReplaceState;
    jest.restoreAllMocks();
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
});


