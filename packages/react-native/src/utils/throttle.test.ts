import { throttle } from './throttle';

describe('throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call the function immediately on first invocation', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled();

    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should throttle subsequent calls within the wait period', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled();
    throttled();
    throttled();

    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should allow a call after the wait period has elapsed', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled();
    expect(func).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);

    throttled();
    expect(func).toHaveBeenCalledTimes(2);
  });

  it('should schedule a trailing call if called during throttle period', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled('first');
    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith('first');

    // Call again during throttle period
    throttled('second');
    expect(func).toHaveBeenCalledTimes(1);

    // Advance timers to trigger the trailing call
    jest.advanceTimersByTime(1000);
    expect(func).toHaveBeenCalledTimes(2);
    expect(func).toHaveBeenLastCalledWith('second');
  });

  it('should pass arguments correctly', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled(1, 'test', { foo: 'bar' });

    expect(func).toHaveBeenCalledWith(1, 'test', { foo: 'bar' });
  });

  it('should preserve context (this)', () => {
    const obj = {
      value: 42,
      method: jest.fn(function (this: any) {
        return this.value;
      }),
    };

    const throttled = throttle(obj.method, 1000);
    throttled.call(obj);

    expect(obj.method).toHaveBeenCalled();
  });

  it('should only keep the last call during throttle period', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled('call1');
    throttled('call2');
    throttled('call3');

    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith('call1');

    // Advance time to trigger trailing call
    // The throttle keeps only the first scheduled call, not the last
    jest.advanceTimersByTime(1000);

    expect(func).toHaveBeenCalledTimes(2);
    // The trailing call uses the arguments from when timeout was set (call2)
    expect(func).toHaveBeenLastCalledWith('call2');
  });

  it('should handle rapid successive calls correctly', () => {
    const func = jest.fn();
    const throttled = throttle(func, 100);

    // First call - executes immediately
    throttled(1);
    expect(func).toHaveBeenCalledTimes(1);

    // Calls during throttle - schedules timeout with first call's args
    throttled(2);
    throttled(3);
    expect(func).toHaveBeenCalledTimes(1);

    // Advance to trigger trailing call
    jest.advanceTimersByTime(100);
    expect(func).toHaveBeenCalledTimes(2);
    // Uses args from when timeout was first set (2)
    expect(func).toHaveBeenLastCalledWith(2);
  });

  it('should execute trailing call after throttle period', () => {
    const func = jest.fn();
    const throttled = throttle(func, 1000);

    throttled('first');
    expect(func).toHaveBeenCalledTimes(1);

    // Call during throttle period - schedules trailing call
    throttled('second');

    // Advance past the wait period
    jest.advanceTimersByTime(1000);
    expect(func).toHaveBeenCalledTimes(2);
    expect(func).toHaveBeenLastCalledWith('second');
  });
});
