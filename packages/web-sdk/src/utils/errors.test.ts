import { defaultErrorArgsSerializer, type ExceptionEvent, stringifyExternalJson, type TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { initializeFaro } from "../initialize";
import { ConsoleInstrumentation } from '../instrumentations';
import { registerOnerror } from '../instrumentations/errors/registerOnerror';

import { getDetailsFromConsoleErrorArgs, getDetailsFromErrorArgs } from './errors';

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
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.value).toBe('console.error: boo other details');
  });

  it('parses text values and an object passed to console.error', () => {
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

    const details = { other: 'details' };
    console.error('boo', details);
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.value).toBe('console.error: boo ' + stringifyExternalJson(details));
  });

  it('getDetailsFromConsoleErrorArgs returns correct values', () => {
    let errorDetails;
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

    expect((errorDetails as any)?.value).toBe("boo");
    expect((errorDetails as any)?.stackFrames[0].filename).toBe("some file");
    expect((errorDetails as any)?.stackFrames[0].lineno).toBe(10);
    expect((errorDetails as any)?.stackFrames[0].colno).toBe(10);
    expect(transport.items).toHaveLength(1);
  });

  it('getDetailsFromConsoleErrorArgs returns correct values when an Error is passed', () => {
    let errorDetails;
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

    expect((errorDetails as any)?.value).toBe("boo");
    expect(transport.items).toHaveLength(1);
  });

  it('getDetailsFromConsoleErrorArgs returns correct values', () => {
    let errorDetails;
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

    expect((errorDetails as any)?.value).toBe("boo");
    expect(transport.items).toHaveLength(1);
  });
});
