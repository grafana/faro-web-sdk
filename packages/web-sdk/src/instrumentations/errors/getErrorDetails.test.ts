import {
  defaultErrorArgsSerializer,
  type ExceptionEvent,
  initializeFaro,
  LogEvent,
  stringifyExternalJson,
  type TransportItem,
} from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { ConsoleInstrumentation } from '../console';

import { ErrorDetails, getDetailsFromConsoleErrorArgs, getDetailsFromErrorArgs } from './getErrorDetails';
import { registerOnerror } from './registerOnerror';

describe('errors', () => {
  it('parses an Error passed to console.error', () => {
    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        instrumentations: [new ConsoleInstrumentation()],
        transports: [transport],
        unpatchedConsole: {
          error: jest.fn(),
        } as unknown as Console,
      })
    );

    registerOnerror(api);

    console.error(new Error('boo'));
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.value).toBe('console.error: boo');
  });

  it('parses text values passed to console.error', () => {
    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        instrumentations: [new ConsoleInstrumentation()],
        transports: [transport],
        unpatchedConsole: {
          error: jest.fn(),
        } as unknown as Console,
      })
    );

    registerOnerror(api);

    console.error('boo', 'other', 'details');
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.value).toBe(
      'console.error: boo other details'
    );
  });

  it('parses text values and an object passed to console.error', () => {
    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        instrumentations: [new ConsoleInstrumentation()],
        transports: [transport],
        consoleInstrumentation: {
          serializeErrors: true,
        },
        unpatchedConsole: {
          error: jest.fn(),
        } as unknown as Console,
      })
    );

    registerOnerror(api);

    const details = { other: 'details' };
    console.error('boo', details);
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.value).toBe(
      'console.error: boo ' + stringifyExternalJson(details)
    );
  });

  it('parses text values and an object passed to console.error with custom serializer', () => {
    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        instrumentations: [new ConsoleInstrumentation()],
        transports: [transport],
        consoleInstrumentation: {
          errorSerializer: () => 'custom serializer',
        },
        unpatchedConsole: {
          error: jest.fn(),
        } as unknown as Console,
      })
    );

    registerOnerror(api);

    const details = { other: 'details' };
    console.error('boo', details);
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.value).toBe(
      'console.error: custom serializer'
    );
  });

  it('parses text values and an object passed to console.error and returns it as a log', () => {
    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        instrumentations: [new ConsoleInstrumentation()],
        transports: [transport],
        consoleInstrumentation: {
          consoleErrorAsLog: true,
          serializeErrors: true,
        },
        unpatchedConsole: {
          error: jest.fn(),
        } as unknown as Console,
      })
    );

    registerOnerror(api);

    const details = { other: 'details' };
    console.error('boo', details);
    expect((transport.items[0] as TransportItem<LogEvent>).payload.message).toBe(
      'console.error: boo ' + stringifyExternalJson(details)
    );
    expect((transport.items[0] as TransportItem<LogEvent>).payload?.context?.['value']).toBe(
      'boo ' + stringifyExternalJson(details)
    );
  });

  it('getDetailsFromConsoleErrorArgs returns correct values', () => {
    let errorDetails: ErrorDetails = {};
    window.onerror = (...args) => {
      errorDetails = getDetailsFromErrorArgs(args);
    };

    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        instrumentations: [new ConsoleInstrumentation()],
        transports: [transport],
        unpatchedConsole: {
          error: jest.fn(),
        } as unknown as Console,
      })
    );

    registerOnerror(api);

    window.onerror('boo', 'some file', 10, 10);

    expect((errorDetails as ErrorDetails)?.value).toBe('boo');
    expect((errorDetails as ErrorDetails)?.stackFrames?.[0]?.filename).toBe('some file');
    expect((errorDetails as ErrorDetails)?.stackFrames?.[0]?.lineno).toBe(10);
    expect((errorDetails as ErrorDetails)?.stackFrames?.[0]?.colno).toBe(10);
    expect(transport.items).toHaveLength(1);
  });

  it('getDetailsFromConsoleErrorArgs returns correct values when an Error is passed to onerror along with other options', () => {
    let errorDetails: ErrorDetails = {};
    window.onerror = (...args) => {
      errorDetails = getDetailsFromErrorArgs(args);
    };

    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        instrumentations: [new ConsoleInstrumentation()],
        transports: [transport],
        unpatchedConsole: {
          error: jest.fn(),
        } as unknown as Console,
      })
    );

    registerOnerror(api);

    window.onerror('not boo', 'some file', 10, 10, new Error('boo'));

    expect((errorDetails as ErrorDetails)?.value).toBe('boo');
    expect(transport.items).toHaveLength(1);
  });

  it('getDetailsFromConsoleErrorArgs returns correct values when an Error is passed to onerror', () => {
    let errorDetails: ErrorDetails = {};
    window.onerror = (...args) => {
      errorDetails = getDetailsFromConsoleErrorArgs(args, defaultErrorArgsSerializer);
    };

    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        instrumentations: [new ConsoleInstrumentation()],
        transports: [transport],
        unpatchedConsole: {
          error: jest.fn(),
        } as unknown as Console,
      })
    );

    registerOnerror(api);

    window.onerror(new Error('boo') as unknown as Event);

    expect((errorDetails as ErrorDetails)?.value).toBe('boo');
    expect(transport.items).toHaveLength(1);
  });

  it('getErrorDetails returns correct values when an ErrorEvent is passed to onerror with special characters in the file path for webkit engine', () => {
    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        instrumentations: [new ConsoleInstrumentation()],
        transports: [transport],
        unpatchedConsole: {
          error: jest.fn(),
        } as unknown as Console,
      })
    );

    registerOnerror(api);
    let e = new Error('Oh crap!');
    e.stack = 'Error: Oh crap!\n    at Object.eval [as refinement] (https://example.com/(main)/[path]/to.js:1:2345)';

    console.error(e);

    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.value).toBe('console.error: Oh crap!');
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.stacktrace?.frames[0]?.filename).toBe(
      'https://example.com/(main)/[path]/to.js'
    );
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.stacktrace?.frames[0]?.colno).toBe(2345);
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.stacktrace?.frames[0]?.lineno).toBe(1);
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.stacktrace?.frames[0]?.function).toBe(
      'Object.eval [as refinement]'
    );
  });
});
