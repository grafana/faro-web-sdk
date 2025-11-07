import { __resetInteractionMonitorForTests, MESSAGE_TYPE_INTERACTION, monitorInteractions } from './interactionMonitor';

describe('monitorInteractions', () => {
  afterEach(() => {
    __resetInteractionMonitorForTests();
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('notifies subscribers when configured events occur', () => {
    const events = ['click', 'keydown'];

    const observable = monitorInteractions(events);
    const subscriber = jest.fn();
    observable.subscribe(subscriber);

    window.dispatchEvent(new Event('click'));
    window.dispatchEvent(new KeyboardEvent('keydown'));

    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenNthCalledWith(1, {
      type: MESSAGE_TYPE_INTERACTION,
      name: 'click',
    });
    expect(subscriber).toHaveBeenNthCalledWith(2, {
      type: MESSAGE_TYPE_INTERACTION,
      name: 'keydown',
    });
  });

  it('does not notify for events that are not configured', () => {
    const observable = monitorInteractions(['click']);
    const subscriber = jest.fn();
    observable.subscribe(subscriber);

    window.dispatchEvent(new Event('scroll'));

    expect(subscriber).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('click'));
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith({
      type: MESSAGE_TYPE_INTERACTION,
      name: 'click',
    });
  });

  it('returns the same observable instance across calls', () => {
    const first = monitorInteractions(['click']);
    const second = monitorInteractions(['keydown']);
    expect(second).toBe(first);
  });

  it('does not add duplicate window listeners for the same event', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    const obs1 = monitorInteractions(['click', 'scroll']);
    const obs2 = monitorInteractions(['click']);
    expect(obs2).toBe(obs1);

    // Two calls for two unique events only once each
    const callsForClick = addEventListenerSpy.mock.calls.filter((c) => c[0] === 'click');
    const callsForScroll = addEventListenerSpy.mock.calls.filter((c) => c[0] === 'scroll');
    expect(callsForClick.length).toBe(1);
    expect(callsForScroll.length).toBe(1);

    addEventListenerSpy.mockRestore();
  });
});
