import { defaultUnpatchedConsole, LogLevel } from '@grafana/faro-core';

import { __resetConsoleMonitorForTests, monitorConsole } from './consoleMonitor';
import { MESSAGE_TYPE_CONSOLE } from './const';

describe('monitorConsole', () => {
  const originalConsole = { ...console };

  afterEach(() => {
    __resetConsoleMonitorForTests();
    jest.resetAllMocks();
  });

  afterAll(() => {
    // Restore original console methods
    Object.assign(console, originalConsole);
    jest.restoreAllMocks();
  });

  it('returns the same observable instance on repeated calls', () => {
    const first = monitorConsole();
    const second = monitorConsole();
    expect(second).toBe(first);
  });

  it('notifies subscribers when console.warn is called', () => {
    const observable = monitorConsole();
    const mockSubscriber = jest.fn();
    observable.subscribe(mockSubscriber);

    console.warn('test warning');

    expect(mockSubscriber).toHaveBeenCalledTimes(1);
    expect(mockSubscriber).toHaveBeenCalledWith({
      type: MESSAGE_TYPE_CONSOLE,
      level: LogLevel.WARN,
      args: ['test warning'],
    });
  });

  it('notifies subscribers when console.info is called', () => {
    const observable = monitorConsole();
    const mockSubscriber = jest.fn();
    observable.subscribe(mockSubscriber);

    console.info('test info');

    expect(mockSubscriber).toHaveBeenCalledTimes(1);
    expect(mockSubscriber).toHaveBeenCalledWith({
      type: MESSAGE_TYPE_CONSOLE,
      level: LogLevel.INFO,
      args: ['test info'],
    });
  });

  it('notifies subscribers when console.error is called', () => {
    const observable = monitorConsole();
    const mockSubscriber = jest.fn();
    observable.subscribe(mockSubscriber);

    console.error('test error');

    expect(mockSubscriber).toHaveBeenCalledTimes(1);
    expect(mockSubscriber).toHaveBeenCalledWith({
      type: MESSAGE_TYPE_CONSOLE,
      level: LogLevel.ERROR,
      args: ['test error'],
    });
  });

  it('calls original console method after notifying subscribers', () => {
    // Spy on the defaultUnpatchedConsole which is what gets called after patching
    const warnSpy = jest.spyOn(defaultUnpatchedConsole, 'warn').mockImplementation(() => {});

    const observable = monitorConsole();
    const mockSubscriber = jest.fn();
    observable.subscribe(mockSubscriber);

    console.warn('test warning');

    expect(warnSpy).toHaveBeenCalledWith('test warning');
    expect(mockSubscriber).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('allows overriding unpatchedConsole for testing', () => {
    const mockConsole = {
      warn: jest.fn(),
    } as unknown as typeof console;

    const observable = monitorConsole(mockConsole);
    const mockSubscriber = jest.fn();
    observable.subscribe(mockSubscriber);

    console.warn('test warning');

    // The mock unpatchedConsole should be called
    expect(mockConsole.warn).toHaveBeenCalledWith('test warning');
    expect(mockSubscriber).toHaveBeenCalled();
  });

  it('notifies ALL subscribers when console method is called (multiple isolated instances)', () => {
    const observable = monitorConsole();

    // Simulate multiple Faro instances subscribing
    const subscriber1 = jest.fn();
    const subscriber2 = jest.fn();
    const subscriber3 = jest.fn();

    observable.subscribe(subscriber1);
    observable.subscribe(subscriber2);
    observable.subscribe(subscriber3);

    console.warn('message for all');

    // All subscribers should receive the event
    expect(subscriber1).toHaveBeenCalledTimes(1);
    expect(subscriber2).toHaveBeenCalledTimes(1);
    expect(subscriber3).toHaveBeenCalledTimes(1);

    // They should all receive the same message
    const expectedMessage = {
      type: MESSAGE_TYPE_CONSOLE,
      level: LogLevel.WARN,
      args: ['message for all'],
    };
    expect(subscriber1).toHaveBeenCalledWith(expectedMessage);
    expect(subscriber2).toHaveBeenCalledWith(expectedMessage);
    expect(subscriber3).toHaveBeenCalledWith(expectedMessage);
  });

  it('allows subscribers to unsubscribe independently', () => {
    const observable = monitorConsole();

    const subscriber1 = jest.fn();
    const subscriber2 = jest.fn();

    const subscription1 = observable.subscribe(subscriber1);
    observable.subscribe(subscriber2);

    console.warn('first message');

    expect(subscriber1).toHaveBeenCalledTimes(1);
    expect(subscriber2).toHaveBeenCalledTimes(1);

    // Unsubscribe the first one
    subscription1.unsubscribe();

    console.warn('second message');

    // subscriber1 should not receive the second message
    expect(subscriber1).toHaveBeenCalledTimes(1);
    // subscriber2 should receive both messages
    expect(subscriber2).toHaveBeenCalledTimes(2);
  });

  it('patches console only once even when called multiple times', () => {
    // Get the console.warn before any patching
    const preMonitorWarn = console.warn;

    // Call monitorConsole multiple times
    monitorConsole();
    const afterFirstPatch = console.warn;

    monitorConsole();
    const afterSecondCall = console.warn;

    // The function should be the same after the second call (no double-patching)
    expect(afterFirstPatch).toBe(afterSecondCall);
    // But it should be different from the original
    expect(afterFirstPatch).not.toBe(preMonitorWarn);
  });

  it('resets properly for tests', () => {
    const originalWarn = console.warn;

    monitorConsole();
    const patchedWarn = console.warn;
    expect(patchedWarn).not.toBe(originalWarn);

    __resetConsoleMonitorForTests();

    // After reset, console.warn should be restored
    expect(console.warn).toBe(originalWarn);

    // A new call should create a fresh observable
    const newObservable = monitorConsole();
    const subscriber = jest.fn();
    newObservable.subscribe(subscriber);

    console.warn('after reset');
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('emits events for all log levels', () => {
    const receivedLevels: LogLevel[] = [];

    monitorConsole().subscribe(({ level }) => {
      receivedLevels.push(level);
    });

    // Call all log levels
    console.debug('debug');
    console.trace('trace');
    console.log('log');
    console.info('info');
    console.warn('warn');
    console.error('error');

    // All 6 log levels should be captured
    expect(receivedLevels).toContain(LogLevel.DEBUG);
    expect(receivedLevels).toContain(LogLevel.TRACE);
    expect(receivedLevels).toContain(LogLevel.LOG);
    expect(receivedLevels).toContain(LogLevel.INFO);
    expect(receivedLevels).toContain(LogLevel.WARN);
    expect(receivedLevels).toContain(LogLevel.ERROR);
  });
});
