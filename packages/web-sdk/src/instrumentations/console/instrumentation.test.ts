import { initializeFaro } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { makeCoreConfig } from '../../config';

import { ConsoleInstrumentation } from './instrumentation';

describe('ConsoleInstrumentation', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('send a faro error when console.error is called', () => {
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
    // @ts-expect-error
    expect(mockTransport.items[0]?.payload.type).toBe('Error');
    // @ts-expect-error
    expect(mockTransport.items[0]?.payload.value).toBe('console.error no 1');

    // @ts-expect-error
    expect(mockTransport.items[1]?.payload.type).toBe('Error');
    // @ts-expect-error
    expect(mockTransport.items[1]?.payload.value).toBe('with object {"foo":"bar","baz":"bam"}');
  });
});
