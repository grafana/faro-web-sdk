import { initializeFaro, LogLevel, TransportItem } from '@grafana/faro-core';
import type { ExceptionEvent, LogEvent } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { makeCoreConfig } from '../../config';

import { ConsoleInstrumentation } from './instrumentation';

describe('ConsoleInstrumentation', () => {
  const originalConsole = console;

  beforeEach(() => {
    global.console = {
      error: jest.fn(),
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn(),
    } as unknown as Console;
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    global.console = originalConsole;
  });

  it('sends a faro error when console.error is called', () => {
    const mockTransport = new MockTransport();

    initializeFaro(
      makeCoreConfig(
        mockConfig({
          transports: [mockTransport],
          instrumentations: [new ConsoleInstrumentation()],
          unpatchedConsole: {
            error: jest.fn(),
          } as unknown as Console,
        })
      )!
    );

    console.error('console.error no 1');
    console.error('with object', { foo: 'bar', baz: 'bam' });

    expect(mockTransport.items).toHaveLength(2);

    expect((mockTransport.items[0] as TransportItem<ExceptionEvent>)?.payload.type).toBe('Error');
    expect((mockTransport.items[0] as TransportItem<ExceptionEvent>)?.payload.value).toBe(
      'console.error: console.error no 1'
    );
    expect((mockTransport.items[1] as TransportItem<ExceptionEvent>)?.payload.type).toBe('Error');
    expect((mockTransport.items[1] as TransportItem<ExceptionEvent>)?.payload.value).toBe(
      'console.error: with object [object Object]'
    );
  });

  it('Handles objects with circular references', () => {
    const mockTransport = new MockTransport();

    initializeFaro(
      makeCoreConfig(
        mockConfig({
          transports: [mockTransport],
          instrumentations: [new ConsoleInstrumentation()],
          unpatchedConsole: {
            error: jest.fn(),
          } as unknown as Console,
        })
      )!
    );

    const objWithCircularRef = { foo: 'bar', baz: 'bam' };
    (objWithCircularRef as any).circular = objWithCircularRef;

    console.error('with circular refs object', objWithCircularRef);

    expect((mockTransport.items[0] as TransportItem<ExceptionEvent>)?.payload.value).toBe(
      'console.error: with circular refs object [object Object]'
    );
  });

  it('sends a faro log for console.error calls if configured', () => {
    const mockTransport = new MockTransport();

    initializeFaro(
      makeCoreConfig(
        mockConfig({
          transports: [mockTransport],
          instrumentations: [new ConsoleInstrumentation()],
          unpatchedConsole: {
            error: jest.fn(),
          } as unknown as Console,
          consoleInstrumentation: {
            consoleErrorAsLog: true,
          },
        })
      )!
    );

    console.error('console.error log no 1');
    console.error('console.error log with object', { foo: 'bar', baz: 'bam' });

    expect(mockTransport.items).toHaveLength(2);

    expect((mockTransport.items[0] as TransportItem<LogEvent>)?.payload.message).toBe('console.error log no 1');
    expect((mockTransport.items[1] as TransportItem<LogEvent>)?.payload.message).toBe(
      'console.error log with object [object Object]'
    );
  });

  it('Uses legacy config options', () => {
    const mockTransport = new MockTransport();
    initializeFaro(
      makeCoreConfig(
        mockConfig({
          transports: [mockTransport],
          instrumentations: [
            new ConsoleInstrumentation({
              consoleErrorAsLog: true,
              disabledLevels: [LogLevel.LOG],
            }),
          ],
          unpatchedConsole: {
            error: jest.fn(),
            log: jest.fn(),
            info: jest.fn(),
          } as unknown as Console,
        })
      )!
    );

    console.error('error logs are enabled');
    console.info('info logs are enabled');
    console.log('log logs are disabled');

    expect(mockTransport.items).toHaveLength(2);
    expect((mockTransport.items[0] as TransportItem<LogEvent>)?.payload.message).toBe('error logs are enabled');
    expect((mockTransport.items[1] as TransportItem<LogEvent>)?.payload.message).toBe('info logs are enabled');
  });

  it('sends logs for the default enabled event if no config is provided', () => {
    const mockTransport = new MockTransport();

    initializeFaro(
      makeCoreConfig(
        mockConfig({
          transports: [mockTransport],
          instrumentations: [new ConsoleInstrumentation()],
          unpatchedConsole: {
            error: jest.fn(),
            log: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            trace: jest.fn(),
            debug: jest.fn(),
          } as unknown as Console,
        })
      )!
    );

    // included by default
    const infoLogMessage = 'info is logged by default';
    console.info(infoLogMessage);

    const warnLogMessage = 'warn is logged by default';
    console.warn(warnLogMessage);

    const errorLogMessage = 'error is logged by default';
    console.error(errorLogMessage);

    const excludedLogMessage = "log isn't logged by default";

    // excluded by default
    console.log(excludedLogMessage);
    const excludedTraceLogMessage = "trace isn't logged by default";
    // eslint-disable-next-line no-console
    console.trace(excludedTraceLogMessage);
    const excludedDebugMessage = "debug isn't logged by default";
    // eslint-disable-next-line no-console
    console.debug(excludedDebugMessage);

    expect(mockTransport.items).toHaveLength(3);

    expect((mockTransport.items[0] as TransportItem<LogEvent>)?.payload.message).toBe(infoLogMessage);
    expect((mockTransport.items[0] as TransportItem<LogEvent>)?.payload.level).toBe('info');

    expect((mockTransport.items[1] as TransportItem<LogEvent>)?.payload.message).toBe(warnLogMessage);
    expect((mockTransport.items[1] as TransportItem<LogEvent>)?.payload.level).toBe('warn');

    // error is logged by default and is logged as an exception signal
    expect((mockTransport.items[2] as TransportItem<ExceptionEvent>)?.payload.value).toBe(
      'console.error: ' + errorLogMessage
    );
  });
});
