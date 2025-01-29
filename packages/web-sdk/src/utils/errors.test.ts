import type { ExceptionEvent, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { initializeFaro } from "../initialize";
import { ConsoleInstrumentation } from '../instrumentations';
import { registerOnerror } from '../instrumentations/errors/registerOnerror';

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
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.stacktrace?.frames.length).toBeGreaterThan(0);
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
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.stacktrace?.frames.length).toBeLessThanOrEqual(0);
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

    console.error('boo', { other: 'details' });
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.value).toBe('console.error: boo { other: "details" }');
    expect((transport.items[0] as TransportItem<ExceptionEvent>).payload.stacktrace?.frames.length).toBeLessThanOrEqual(0);
  });
});
