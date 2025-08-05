import { throttle } from './throttle';

describe('throttle', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('Executes callback immediately for first call and executes the next callback only if delay is reached.', () => {
    const mockCallback = jest.fn();

    const doThrottle = throttle(mockCallback, 500);

    doThrottle();
    expect(mockCallback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    doThrottle();
    expect(mockCallback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(500);
    doThrottle();
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  it('Applies the args of the last call to callback.', () => {
    const mockCallback = jest.fn();

    const doThrottle = throttle(mockCallback, 500);

    doThrottle('A');
    jest.advanceTimersByTime(200);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('A');

    doThrottle('B');
    jest.advanceTimersByTime(200);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('A');

    doThrottle('C');
    jest.advanceTimersByTime(100);
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenCalledWith('A');

    doThrottle('D');
    jest.advanceTimersByTime(100);
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenLastCalledWith('C');

    doThrottle('END');
    jest.advanceTimersByTime(400);
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(mockCallback).toHaveBeenLastCalledWith('END');
  });
});
