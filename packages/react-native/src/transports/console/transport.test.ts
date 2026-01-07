import { getTransportBody, LogEvent, LogLevel, TransportItem, TransportItemType } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { ConsoleTransport } from './transport';

const mockSessionId = '123';

const logItem: TransportItem<LogEvent> = {
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: LogLevel.INFO,
    message: 'test message',
    timestamp: new Date().toISOString(),
  },
  meta: {
    session: { id: mockSessionId },
  },
};

describe('ConsoleTransport', () => {
  let transport: ConsoleTransport;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spies will be created per-test after transport is instantiated
  });

  afterEach(() => {
    consoleDebugSpy?.mockRestore();
    consoleInfoSpy?.mockRestore();
    consoleWarnSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
    consoleLogSpy?.mockRestore();
  });

  it('should have correct name and version', () => {
    const transport = new ConsoleTransport();
    expect(transport.name).toBe('@grafana/faro-react-native:transport-console');
    expect(typeof transport.version).toBe('string');
  });

  it('should output to console.debug by default', () => {
    transport = new ConsoleTransport();
    transport.internalLogger = mockInternalLogger;
    consoleDebugSpy = jest.spyOn(transport.unpatchedConsole, 'debug').mockImplementation();

    transport.send(logItem);

    expect(consoleDebugSpy).toHaveBeenCalledWith('New event', getTransportBody([logItem]));
  });

  it('should output to console.info when level is INFO', () => {
    transport = new ConsoleTransport({ level: LogLevel.INFO });
    transport.internalLogger = mockInternalLogger;
    consoleInfoSpy = jest.spyOn(transport.unpatchedConsole, 'info').mockImplementation();

    transport.send(logItem);

    expect(consoleInfoSpy).toHaveBeenCalledWith('New event', getTransportBody([logItem]));
  });

  it('should output to console.warn when level is WARN', () => {
    transport = new ConsoleTransport({ level: LogLevel.WARN });
    transport.internalLogger = mockInternalLogger;
    consoleWarnSpy = jest.spyOn(transport.unpatchedConsole, 'warn').mockImplementation();

    transport.send(logItem);

    expect(consoleWarnSpy).toHaveBeenCalledWith('New event', getTransportBody([logItem]));
  });

  it('should output to console.error when level is ERROR', () => {
    transport = new ConsoleTransport({ level: LogLevel.ERROR });
    transport.internalLogger = mockInternalLogger;
    consoleErrorSpy = jest.spyOn(transport.unpatchedConsole, 'error').mockImplementation();

    transport.send(logItem);

    expect(consoleErrorSpy).toHaveBeenCalledWith('New event', getTransportBody([logItem]));
  });

  it('should output to console.log when level is LOG', () => {
    transport = new ConsoleTransport({ level: LogLevel.LOG });
    transport.internalLogger = mockInternalLogger;
    consoleLogSpy = jest.spyOn(transport.unpatchedConsole, 'log').mockImplementation();

    transport.send(logItem);

    expect(consoleLogSpy).toHaveBeenCalledWith('New event', getTransportBody([logItem]));
  });

  it('should handle different transport item types', () => {
    transport = new ConsoleTransport();
    transport.internalLogger = mockInternalLogger;
    consoleDebugSpy = jest.spyOn(transport.unpatchedConsole, 'debug').mockImplementation();

    const exceptionItem: TransportItem = {
      type: TransportItemType.EXCEPTION,
      payload: {
        type: 'Error',
        value: 'Test error',
        stacktrace: {
          frames: [],
        },
        timestamp: new Date().toISOString(),
      },
      meta: {
        session: { id: mockSessionId },
      },
    };

    transport.send(exceptionItem);

    expect(consoleDebugSpy).toHaveBeenCalledWith('New event', getTransportBody([exceptionItem]));
  });

  it('should format output with session metadata', () => {
    transport = new ConsoleTransport();
    transport.internalLogger = mockInternalLogger;
    consoleDebugSpy = jest.spyOn(transport.unpatchedConsole, 'debug').mockImplementation();

    const itemWithMetadata: TransportItem<LogEvent> = {
      ...logItem,
      meta: {
        session: { id: 'session-123' },
        user: { id: 'user-456' },
      },
    };

    transport.send(itemWithMetadata);

    const expectedBody = getTransportBody([itemWithMetadata]);
    expect(consoleDebugSpy).toHaveBeenCalledWith('New event', expectedBody);
    expect(expectedBody.meta).toEqual({
      session: { id: 'session-123' },
      user: { id: 'user-456' },
    });
  });

  it('isBatched returns false', () => {
    const transport = new ConsoleTransport();
    expect(transport.isBatched()).toBe(false);
  });

  it('should handle multiple sends', () => {
    transport = new ConsoleTransport();
    transport.internalLogger = mockInternalLogger;
    consoleDebugSpy = jest.spyOn(transport.unpatchedConsole, 'debug').mockImplementation();

    transport.send(logItem);
    transport.send(logItem);
    transport.send(logItem);

    expect(consoleDebugSpy).toHaveBeenCalledTimes(3);
  });

  it('should properly format measurement items', () => {
    transport = new ConsoleTransport({ level: LogLevel.INFO });
    transport.internalLogger = mockInternalLogger;
    consoleInfoSpy = jest.spyOn(transport.unpatchedConsole, 'info').mockImplementation();

    const measurementItem: TransportItem = {
      type: TransportItemType.MEASUREMENT,
      payload: {
        type: 'custom_metric',
        values: {
          value: 42,
        },
        timestamp: new Date().toISOString(),
      },
      meta: {
        session: { id: mockSessionId },
      },
    };

    transport.send(measurementItem);

    expect(consoleInfoSpy).toHaveBeenCalledWith('New event', getTransportBody([measurementItem]));
  });
});
