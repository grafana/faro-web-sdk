import { MESSAGE_TYPE_INTERACTION, monitorInteractions } from './interactionMonitor';

describe('monitorInteractions', () => {
  afterEach(() => {
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
});


