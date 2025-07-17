import type { ExceptionEventExtended, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { initializeFaro } from '../../initialize';

import { registerOnerror } from './registerOnerror';

describe('registerOnerror', () => {
  it('will preserve the old callback', () => {
    let called = false;

    window.onerror = () => {
      called = true;
    };

    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
      })
    );

    registerOnerror(api);

    window.onerror('boo', 'some file', 10, 10, new Error('boo'));
    expect(called).toBe(true);
    expect(transport.items).toHaveLength(1);
  });

  it('In case of an error, the original error is not lost', () => {
    const originalError = new Error('original error');
    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
        preserveOriginalError: true,
      })
    );

    registerOnerror(api);

    window.onerror?.('boo', 'some file', 10, 10, originalError);
    expect(transport.items).toHaveLength(1);

    expect((transport.items[0] as TransportItem<ExceptionEventExtended>).payload.originalError).toBe(originalError);
  });

  // Integration test for to test if errors are correctly ignored.
  // This is needed because of issue: https://github.com/grafana/faro-web-sdk/issues/1160
  it('will filter out errors by string or regex', () => {
    const transport = new MockTransport();

    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
        ignoreErrors: ['chrome-extension'],
        preserveOriginalError: true,
      })
    );

    registerOnerror(api);

    window.onerror?.('boo', 'some file', 10, 10, new Error('Tracked error'));

    const mockErrorWithStacktrace = new Error('Extension error');
    mockErrorWithStacktrace.name = 'MockError';
    mockErrorWithStacktrace.stack = `at chrome-extension://<extension-id>/path/to/script.js:1:1";`;

    window.onerror?.('boo', 'some file', 10, 10, mockErrorWithStacktrace);

    expect(transport.items).toHaveLength(1);
    expect((transport.items[0]?.payload as ExceptionEventExtended).value).toEqual('Tracked error');
  });
});
