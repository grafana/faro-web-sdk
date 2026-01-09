import { initializeFaro, LogLevel, stringifyExternalJson, TransportItem } from '@grafana/faro-core';
import type { APIEvent, ExceptionEvent, LogEvent } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { makeCoreConfig } from '../../config';
import { __resetConsoleMonitorForTests } from '../_internal/monitors/consoleMonitor';

import { ConsoleInstrumentation } from './instrumentation';

// Mock globalObject for SDK's _faroInternal registration.
// This enables testing non-isolated Faro instances by providing a clean object
// for each test. This is separate from global.console below - they serve different SDK subsystems.
let mockGlobalObject: Record<string, unknown> = {};

// Mock globalObject module - all internal imports use the index path
jest.mock('@grafana/faro-core/src/globalObject', () => ({
  get globalObject() {
    return mockGlobalObject;
  },
}));

function resetMockGlobalObject() {
  mockGlobalObject = {};
}

describe('ConsoleInstrumentation', () => {
  const originalConsole = console;

  beforeEach(() => {
    resetMockGlobalObject();

    // Window global mock for capturing console.log/error calls.
    // The ConsoleInstrumentation patches these methods to intercept logs.
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
    __resetConsoleMonitorForTests();
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

  it('sends a faro error serialized with error serializer when console.error is called', () => {
    const mockTransport = new MockTransport();

    initializeFaro(
      makeCoreConfig(
        mockConfig({
          transports: [mockTransport],
          instrumentations: [new ConsoleInstrumentation()],
          consoleInstrumentation: {
            serializeErrors: true,
          },
          unpatchedConsole: {
            error: jest.fn(),
          } as unknown as Console,
        })
      )!
    );

    console.error('console.error no 1');

    const context = { foo: 'bar', baz: 'bam' };
    console.error('with object', context);

    expect(mockTransport.items).toHaveLength(2);

    expect((mockTransport.items[0] as TransportItem<ExceptionEvent>)?.payload.type).toBe('Error');
    expect((mockTransport.items[0] as TransportItem<ExceptionEvent>)?.payload.value).toBe(
      'console.error: console.error no 1'
    );
    expect((mockTransport.items[1] as TransportItem<ExceptionEvent>)?.payload.type).toBe('Error');
    expect((mockTransport.items[1] as TransportItem<ExceptionEvent>)?.payload.value).toBe(
      'console.error: with object ' + stringifyExternalJson(context)
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

  it('Handles objects with circular references with error serializer', () => {
    const mockTransport = new MockTransport();

    initializeFaro(
      makeCoreConfig(
        mockConfig({
          transports: [mockTransport],
          instrumentations: [new ConsoleInstrumentation()],
          consoleInstrumentation: {
            serializeErrors: true,
          },
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
      'console.error: with circular refs object ' + stringifyExternalJson(objWithCircularRef)
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

    console.error('log no 1');
    console.error('log with object', { foo: 'bar', baz: 'bam' });

    expect(mockTransport.items).toHaveLength(2);

    expect((mockTransport.items[0] as TransportItem<LogEvent>)?.payload.message).toBe('console.error: log no 1');
    expect((mockTransport.items[1] as TransportItem<LogEvent>)?.payload.message).toBe(
      'console.error: log with object [object Object]'
    );
  });

  it('sends a faro log using error serializer for console.error calls if configured', () => {
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
            serializeErrors: true,
          },
        })
      )!
    );

    console.error('log no 1');

    const context = { foo: 'bar', baz: 'bam' };
    console.error('log with object', context);

    expect(mockTransport.items).toHaveLength(2);

    expect((mockTransport.items[0] as TransportItem<LogEvent>)?.payload.message).toBe('console.error: log no 1');
    expect((mockTransport.items[1] as TransportItem<LogEvent>)?.payload.message).toBe(
      'console.error: log with object ' + stringifyExternalJson(context)
    );
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

    console.trace(excludedTraceLogMessage);
    const excludedDebugMessage = "debug isn't logged by default";

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

  describe('console instrumentation race condition', () => {
    it('should route console.error to both instances', () => {
      const transport1 = new MockTransport();
      const transport2 = new MockTransport();

      initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport1],
            instrumentations: [new ConsoleInstrumentation()],
            unpatchedConsole: {
              error: jest.fn(),
            } as unknown as Console,
          })
        )!
      );

      initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport2],
            instrumentations: [new ConsoleInstrumentation()],
            unpatchedConsole: {
              error: jest.fn(),
            } as unknown as Console,
          })
        )!
      );

      console.error('Test console error');

      const transport1Errors = transport1.items.filter(
        (item: TransportItem<APIEvent>) =>
          item.type === 'exception' || (item.type === 'log' && (item.payload as LogEvent).level === 'error')
      );
      const transport2Errors = transport2.items.filter(
        (item: TransportItem<APIEvent>) =>
          item.type === 'exception' || (item.type === 'log' && (item.payload as LogEvent).level === 'error')
      );

      expect(transport1Errors.length).toBeGreaterThan(0);
      expect(transport2Errors.length).toBeGreaterThan(0);
    });

    it('should route console.log to both instances', () => {
      const transport1 = new MockTransport();
      const transport2 = new MockTransport();

      initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport1],
            instrumentations: [new ConsoleInstrumentation()],
            consoleInstrumentation: {
              disabledLevels: [], // Enable all levels including log
            },
            unpatchedConsole: {
              log: jest.fn(),
            } as unknown as Console,
          })
        )!
      );

      initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport2],
            instrumentations: [new ConsoleInstrumentation()],
            consoleInstrumentation: {
              disabledLevels: [], // Enable all levels including log
            },
            unpatchedConsole: {
              log: jest.fn(),
            } as unknown as Console,
          })
        )!
      );

      console.log('Test log message');

      const transport1Logs = transport1.items.filter((item: TransportItem<APIEvent>) => item.type === 'log');
      const transport2Logs = transport2.items.filter((item: TransportItem<APIEvent>) => item.type === 'log');

      expect(transport1Logs.length).toBeGreaterThan(0);
      expect(transport2Logs.length).toBeGreaterThan(0);
    });

    it('should respect different disabledLevels for each isolated instance', () => {
      const transport1 = new MockTransport();
      const transport2 = new MockTransport();

      // Instance 1: only captures ERROR (disables everything else)
      initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport1],
            instrumentations: [new ConsoleInstrumentation()],
            consoleInstrumentation: {
              disabledLevels: [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG, LogLevel.INFO, LogLevel.WARN],
            },
            unpatchedConsole: {
              error: jest.fn(),
              warn: jest.fn(),
              info: jest.fn(),
            } as unknown as Console,
          })
        )!
      );

      // Instance 2: captures WARN, INFO, ERROR (disables DEBUG, TRACE, LOG)
      initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport2],
            instrumentations: [new ConsoleInstrumentation()],
            consoleInstrumentation: {
              disabledLevels: [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG],
            },
            unpatchedConsole: {
              error: jest.fn(),
              warn: jest.fn(),
              info: jest.fn(),
            } as unknown as Console,
          })
        )!
      );

      // Emit various console levels
      console.info('info message');
      console.warn('warn message');
      console.error('error message');
      console.debug('debug message');
      console.trace('trace message');
      console.log('log message');

      // Instance 1 should only have ERROR (1 item)
      const transport1Items = transport1.items;
      expect(transport1Items).toHaveLength(1);
      expect((transport1Items[0] as TransportItem<ExceptionEvent>).payload.value).toContain('error message');

      // Instance 2 should have INFO, WARN, ERROR (3 items)
      const transport2Items = transport2.items;
      expect(transport2Items).toHaveLength(3);

      const transport2Levels = transport2Items.map((item: TransportItem<APIEvent>) => {
        if (item.type === 'log') {
          return (item.payload as LogEvent).level;
        }
        return 'error'; // exception type
      });
      expect(transport2Levels).toContain('info');
      expect(transport2Levels).toContain('warn');
      expect(transport2Levels).toContain('error');
    });

    it('should route console.error to both isolated and non-isolated instances', () => {
      const transport1 = new MockTransport();
      const transport2 = new MockTransport();

      // Non-isolated instance
      initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: false,
            preventGlobalExposure: false,
            transports: [transport1],
            instrumentations: [new ConsoleInstrumentation()],
            unpatchedConsole: {
              error: jest.fn(),
            } as unknown as Console,
          })
        )!
      );

      expect(mockGlobalObject['faro']).toBeDefined();

      // Isolated instance
      initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport2],
            instrumentations: [new ConsoleInstrumentation()],
            unpatchedConsole: {
              error: jest.fn(),
            } as unknown as Console,
          })
        )!
      );

      console.error('Test console error');

      const transport1Errors = transport1.items.filter(
        (item: TransportItem<APIEvent>) =>
          item.type === 'exception' || (item.type === 'log' && (item.payload as LogEvent).level === 'error')
      );
      const transport2Errors = transport2.items.filter(
        (item: TransportItem<APIEvent>) =>
          item.type === 'exception' || (item.type === 'log' && (item.payload as LogEvent).level === 'error')
      );

      expect(transport1Errors.length).toBeGreaterThan(0);
      expect(transport2Errors.length).toBeGreaterThan(0);
    });
  });
});
