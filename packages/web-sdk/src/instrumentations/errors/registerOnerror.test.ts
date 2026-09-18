import { initializeFaro, TransportItem } from '@grafana/faro-core';
import type { APIEvent, ExceptionEvent, ExceptionEventExtended } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { makeCoreConfig } from '../../config';

import { registerOnerror } from './registerOnerror';

// Mock globalObject for SDK's _faroInternal registration.
// This enables testing non-isolated Faro instances by providing a clean object
// for each test.
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

describe('registerOnerror', () => {
  const originalOnError = window.onerror;

  beforeEach(() => {
    resetMockGlobalObject();

    // Reset window.onerror before each test
    window.onerror = null;
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    window.onerror = originalOnError;
  });

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

  describe('window.onerror with multiple instances', () => {
    it('will notify all isolated instances when an error occurs', () => {
      const transport1 = new MockTransport();
      const transport2 = new MockTransport();

      // Initialize first isolated instance
      const { api: api1 } = initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport1],
          })
        )!
      );
      registerOnerror(api1);

      // Initialize second isolated instance
      const { api: api2 } = initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport2],
          })
        )!
      );
      registerOnerror(api2);

      // Trigger error via window.onerror
      const error = new Error('Test error message');
      window.onerror?.('Test error message', 'script.js', 10, 5, error);

      // Filter to get exception items from both transports
      const transport1Errors = transport1.items.filter((item: TransportItem<APIEvent>) => item.type === 'exception');
      const transport2Errors = transport2.items.filter((item: TransportItem<APIEvent>) => item.type === 'exception');

      // Both transports should receive the error
      expect(transport1Errors.length).toBeGreaterThan(0);
      expect(transport2Errors.length).toBeGreaterThan(0);

      // Verify the error message is correct
      expect((transport1Errors[0] as TransportItem<ExceptionEvent>)?.payload.value).toContain('Test error message');
      expect((transport2Errors[0] as TransportItem<ExceptionEvent>)?.payload.value).toContain('Test error message');
    });

    it('will notify all isolated and non-isolated instances when an error occurs', () => {
      const transport1 = new MockTransport();
      const transport2 = new MockTransport();

      // Non-isolated instance
      const { api: api1 } = initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: false,
            preventGlobalExposure: false,
            transports: [transport1],
          })
        )!
      );
      registerOnerror(api1);

      // Verify global faro instance is exposed
      expect(mockGlobalObject['faro']).toBeDefined();

      // Isolated instance
      const { api: api2 } = initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport2],
          })
        )!
      );
      registerOnerror(api2);

      const error = new Error('Mixed instance error');
      window.onerror?.('Mixed instance error', 'app.js', 20, 10, error);

      const transport1Errors = transport1.items.filter((item: TransportItem<APIEvent>) => item.type === 'exception');
      const transport2Errors = transport2.items.filter((item: TransportItem<APIEvent>) => item.type === 'exception');

      expect(transport1Errors.length).toBeGreaterThan(0);
      expect(transport2Errors.length).toBeGreaterThan(0);
    });

    it('should respect different ignoreErrors configs for each instance', () => {
      const transport1 = new MockTransport();
      const transport2 = new MockTransport();

      // Instance 1: ignores errors with "ignore-me" in the message
      const { api: api1 } = initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport1],
            ignoreErrors: ['ignore-me'],
          })
        )!
      );
      registerOnerror(api1);

      // Instance 2: captures all errors
      const { api: api2 } = initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport2],
            ignoreErrors: [],
          })
        )!
      );
      registerOnerror(api2);

      // Trigger error that should be ignored by instance 1
      const ignoredError = new Error('This should ignore-me please');
      window.onerror?.('This should ignore-me please', 'script.js', 10, 5, ignoredError);

      // Trigger error that both should capture
      const capturedError = new Error('This should be captured');
      window.onerror?.('This should be captured', 'script.js', 15, 5, capturedError);

      const transport1Errors = transport1.items.filter((item: TransportItem<APIEvent>) => item.type === 'exception');
      const transport2Errors = transport2.items.filter((item: TransportItem<APIEvent>) => item.type === 'exception');

      // Instance 1 should only have 1 error (the second one)
      expect(transport1Errors.length).toBe(1);
      expect((transport1Errors[0] as TransportItem<ExceptionEvent>)?.payload.value).toContain('captured');

      // Instance 2 should have both errors
      expect(transport2Errors.length).toBe(2);
    });

    it('should preserve original window.onerror handler', () => {
      const transport1 = new MockTransport();
      let originalHandlerCalled = false;

      // Set up an original error handler
      window.onerror = () => {
        originalHandlerCalled = true;
        return false;
      };

      // Initialize Faro instance
      const { api } = initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport1],
          })
        )!
      );
      registerOnerror(api);

      // Trigger error
      const error = new Error('Test error');
      window.onerror?.('Test error', 'script.js', 10, 5, error);

      // Both the original handler and Faro should have been called
      expect(originalHandlerCalled).toBe(true);

      const transport1Errors = transport1.items.filter((item: TransportItem<APIEvent>) => item.type === 'exception');
      expect(transport1Errors.length).toBeGreaterThan(0);
    });

    it('should handle errors without Error object', () => {
      const transport1 = new MockTransport();
      const transport2 = new MockTransport();

      // Initialize two instances
      const { api: api1 } = initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport1],
          })
        )!
      );
      registerOnerror(api1);

      const { api: api2 } = initializeFaro(
        makeCoreConfig(
          mockConfig({
            isolate: true,
            transports: [transport2],
          })
        )!
      );
      registerOnerror(api2);

      // Trigger error without Error object (5th parameter is undefined)
      window.onerror?.('String error message', 'script.js', 10, 5, undefined);

      const transport1Errors = transport1.items.filter((item: TransportItem<APIEvent>) => item.type === 'exception');
      const transport2Errors = transport2.items.filter((item: TransportItem<APIEvent>) => item.type === 'exception');

      // Both should still receive the error
      expect(transport1Errors.length).toBeGreaterThan(0);
      expect(transport2Errors.length).toBeGreaterThan(0);
    });
  });
});
