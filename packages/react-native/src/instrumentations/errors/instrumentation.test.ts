import { initializeFaro } from '@grafana/faro-core';
import type { ExceptionEvent, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { ErrorsInstrumentation } from './index';

// Mock React Native's global error handler
const mockGlobal = global as any;
const originalErrorUtils = mockGlobal.ErrorUtils;

beforeEach(() => {
  // Set up ErrorUtils mock
  mockGlobal.ErrorUtils = {
    getGlobalHandler: jest.fn(() => jest.fn()),
    setGlobalHandler: jest.fn(),
  };

  // Set up event listener mocks
  mockGlobal.addEventListener = jest.fn();
  mockGlobal.removeEventListener = jest.fn();
});

afterEach(() => {
  // Restore original ErrorUtils
  if (originalErrorUtils) {
    mockGlobal.ErrorUtils = originalErrorUtils;
  } else {
    delete mockGlobal.ErrorUtils;
  }

  // Clean up event listeners
  delete mockGlobal.addEventListener;
  delete mockGlobal.removeEventListener;
});

describe('ErrorsInstrumentation', () => {
  describe('initialization', () => {
    it('should initialize and set up global error handler', () => {
      const transport = new MockTransport();
      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new ErrorsInstrumentation()],
        })
      );

      expect(mockGlobal.ErrorUtils.setGlobalHandler).toHaveBeenCalled();
      expect(mockGlobal.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });

    it('should have correct name and version', () => {
      const instrumentation = new ErrorsInstrumentation();
      expect(instrumentation.name).toBe('@grafana/faro-react-native-errors');
      expect(instrumentation.version).toBe('1.0.0');
    });
  });

  describe('error handling', () => {
    it('should capture and report errors', () => {
      const transport = new MockTransport();
      let errorHandler: any;

      mockGlobal.ErrorUtils.setGlobalHandler = jest.fn((handler) => {
        errorHandler = handler;
      });

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new ErrorsInstrumentation()],
        })
      );

      const testError = new Error('Test error');
      errorHandler(testError, false);

      expect(transport.items).toHaveLength(1);
      const item = transport.items[0] as TransportItem<ExceptionEvent>;
      expect(item.payload.type).toBe('Error');
      expect(item.payload.value).toBe('Test error');
    });

    it('should include isFatal context', () => {
      const transport = new MockTransport();
      let errorHandler: any;

      mockGlobal.ErrorUtils.setGlobalHandler = jest.fn((handler) => {
        errorHandler = handler;
      });

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new ErrorsInstrumentation()],
        })
      );

      const testError = new Error('Fatal error');
      errorHandler(testError, true);

      expect(transport.items).toHaveLength(1);
      const item = transport.items[0] as TransportItem<ExceptionEvent>;
      expect(item.payload.context?.isFatal).toBe('true');
    });

    it('should call original error handler', () => {
      const originalHandler = jest.fn();
      mockGlobal.ErrorUtils.getGlobalHandler = jest.fn(() => originalHandler);

      let errorHandler: any;
      mockGlobal.ErrorUtils.setGlobalHandler = jest.fn((handler) => {
        errorHandler = handler;
      });

      const transport = new MockTransport();
      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new ErrorsInstrumentation()],
        })
      );

      const testError = new Error('Test error');
      errorHandler(testError, false);

      expect(originalHandler).toHaveBeenCalledWith(testError, false);
    });
  });

  describe('ignoreErrors', () => {
    it('should ignore errors matching patterns', () => {
      const transport = new MockTransport();
      let errorHandler: any;

      mockGlobal.ErrorUtils.setGlobalHandler = jest.fn((handler) => {
        errorHandler = handler;
      });

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [
            new ErrorsInstrumentation({
              ignoreErrors: [/network timeout/i, /cancelled/i],
            }),
          ],
        })
      );

      // This error should be ignored
      errorHandler(new Error('Network timeout occurred'), false);
      expect(transport.items).toHaveLength(0);

      // This error should be ignored
      errorHandler(new Error('Request cancelled'), false);
      expect(transport.items).toHaveLength(0);

      // This error should be reported
      errorHandler(new Error('Something else failed'), false);
      expect(transport.items).toHaveLength(1);
    });

    it('should not crash on errors without message', () => {
      const transport = new MockTransport();
      let errorHandler: any;

      mockGlobal.ErrorUtils.setGlobalHandler = jest.fn((handler) => {
        errorHandler = handler;
      });

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [
            new ErrorsInstrumentation({
              ignoreErrors: [/test/],
            }),
          ],
        })
      );

      const errorWithoutMessage = { name: 'Error' } as Error;
      expect(() => errorHandler(errorWithoutMessage, false)).not.toThrow();
    });
  });

  describe('error deduplication', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should deduplicate identical errors within time window', () => {
      const transport = new MockTransport();
      let errorHandler: any;

      mockGlobal.ErrorUtils.setGlobalHandler = jest.fn((handler) => {
        errorHandler = handler;
      });

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [
            new ErrorsInstrumentation({
              enableDeduplication: true,
              deduplicationWindow: 5000,
            }),
          ],
        })
      );

      const error1 = new Error('Duplicate error');
      error1.stack = 'same stack';

      const error2 = new Error('Duplicate error');
      error2.stack = 'same stack';

      // First error should be reported
      errorHandler(error1, false);
      expect(transport.items).toHaveLength(1);

      // Second identical error should be deduplicated
      errorHandler(error2, false);
      expect(transport.items).toHaveLength(1);

      // Third identical error should still be deduplicated
      errorHandler(error2, false);
      expect(transport.items).toHaveLength(1);
    });

    it('should not deduplicate different errors', () => {
      const transport = new MockTransport();
      let errorHandler: any;

      mockGlobal.ErrorUtils.setGlobalHandler = jest.fn((handler) => {
        errorHandler = handler;
      });

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [
            new ErrorsInstrumentation({
              enableDeduplication: true,
            }),
          ],
        })
      );

      errorHandler(new Error('Error 1'), false);
      errorHandler(new Error('Error 2'), false);
      errorHandler(new Error('Error 3'), false);

      expect(transport.items).toHaveLength(3);
    });

    it('should respect maxDeduplicationEntries', () => {
      const transport = new MockTransport();
      let errorHandler: any;

      mockGlobal.ErrorUtils.setGlobalHandler = jest.fn((handler) => {
        errorHandler = handler;
      });

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [
            new ErrorsInstrumentation({
              enableDeduplication: true,
              maxDeduplicationEntries: 2,
            }),
          ],
        })
      );

      // Add 3 different errors (max is 2, so oldest should be removed)
      errorHandler(new Error('Error 1'), false);
      errorHandler(new Error('Error 2'), false);
      errorHandler(new Error('Error 3'), false);

      expect(transport.items).toHaveLength(3);

      // First error should now be reported again (it was removed from tracking)
      const error1Again = new Error('Error 1');
      errorHandler(error1Again, false);
      expect(transport.items).toHaveLength(4);
    });

    it('should allow disabling deduplication', () => {
      const transport = new MockTransport();
      let errorHandler: any;

      mockGlobal.ErrorUtils.setGlobalHandler = jest.fn((handler) => {
        errorHandler = handler;
      });

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [
            new ErrorsInstrumentation({
              enableDeduplication: false,
            }),
          ],
        })
      );

      // Create errors with different messages to avoid deduplication
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      const error3 = new Error('Error 3');

      errorHandler(error1, false);
      errorHandler(error2, false);
      errorHandler(error3, false);

      // With deduplication disabled, all 3 different errors should be reported
      expect(transport.items).toHaveLength(3);
    });
  });

  describe('unhandled promise rejections', () => {
    it('should capture unhandled promise rejections', () => {
      const transport = new MockTransport();
      let rejectionHandler: any;

      mockGlobal.addEventListener = jest.fn((event, handler) => {
        if (event === 'unhandledrejection') {
          rejectionHandler = handler;
        }
      });

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new ErrorsInstrumentation()],
        })
      );

      const testError = new Error('Rejected promise');
      rejectionHandler({ reason: testError } as PromiseRejectionEvent);

      expect(transport.items).toHaveLength(1);
      const item = transport.items[0] as TransportItem<ExceptionEvent>;
      expect(item.payload.value).toBe('Rejected promise');
    });

    it('should convert non-Error rejections to Errors', () => {
      const transport = new MockTransport();
      let rejectionHandler: any;

      mockGlobal.addEventListener = jest.fn((event, handler) => {
        if (event === 'unhandledrejection') {
          rejectionHandler = handler;
        }
      });

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new ErrorsInstrumentation()],
        })
      );

      rejectionHandler({ reason: 'String rejection' } as PromiseRejectionEvent);

      expect(transport.items).toHaveLength(1);
      const item = transport.items[0] as TransportItem<ExceptionEvent>;
      expect(item.payload.value).toContain('Unhandled Promise Rejection');
      expect(item.payload.value).toContain('String rejection');
    });

    it('should handle object rejections', () => {
      const transport = new MockTransport();
      let rejectionHandler: any;

      mockGlobal.addEventListener = jest.fn((event, handler) => {
        if (event === 'unhandledrejection') {
          rejectionHandler = handler;
        }
      });

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new ErrorsInstrumentation()],
        })
      );

      rejectionHandler({ reason: { code: 'ERR_FAILED', message: 'Request failed' } } as PromiseRejectionEvent);

      expect(transport.items).toHaveLength(1);
      const item = transport.items[0] as TransportItem<ExceptionEvent>;
      expect(item.payload.value).toContain('Unhandled Promise Rejection');
    });
  });

  describe('unpatch', () => {
    it('should restore original error handler', () => {
      const originalHandler = jest.fn();
      mockGlobal.ErrorUtils.getGlobalHandler = jest.fn(() => originalHandler);

      const transport = new MockTransport();
      const { config } = initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new ErrorsInstrumentation()],
        })
      );

      // Unpatch the instrumentation
      config.instrumentations?.[0]?.unpatch?.();

      expect(mockGlobal.ErrorUtils.setGlobalHandler).toHaveBeenCalledWith(originalHandler);
      expect(mockGlobal.removeEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });

    it('should clear error fingerprints on unpatch', () => {
      const transport = new MockTransport();
      let errorHandler: any;

      mockGlobal.ErrorUtils.setGlobalHandler = jest.fn((handler) => {
        errorHandler = handler;
      });

      const { config } = initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [
            new ErrorsInstrumentation({
              enableDeduplication: true,
            }),
          ],
        })
      );

      const error = new Error('Test error');
      error.stack = 'stack';

      // Report error
      errorHandler(error, false);
      expect(transport.items).toHaveLength(1);

      // Unpatch
      config.instrumentations?.[0]?.unpatch?.();

      // Set up new handler to test that fingerprints were cleared
      mockGlobal.ErrorUtils.setGlobalHandler = jest.fn((handler) => {
        errorHandler = handler;
      });

      // Re-initialize
      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [
            new ErrorsInstrumentation({
              enableDeduplication: true,
            }),
          ],
        })
      );

      // Same error should be reported again (fingerprints were cleared)
      errorHandler(error, false);
      expect(transport.items).toHaveLength(2);
    });
  });

  describe('error handling resilience', () => {
    it('should not crash if error reporting fails', () => {
      let errorHandler: any;

      mockGlobal.ErrorUtils.setGlobalHandler = jest.fn((handler) => {
        errorHandler = handler;
      });

      // Create a transport that throws
      const failingTransport = {
        send: jest.fn(() => {
          throw new Error('Transport failed');
        }),
      };

      initializeFaro(
        mockConfig({
          transports: [failingTransport as any],
          instrumentations: [new ErrorsInstrumentation()],
        })
      );

      const testError = new Error('Test error');
      expect(() => errorHandler(testError, false)).not.toThrow();
    });

    it('should handle errors without stack', () => {
      const transport = new MockTransport();
      let errorHandler: any;

      mockGlobal.ErrorUtils.setGlobalHandler = jest.fn((handler) => {
        errorHandler = handler;
      });

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new ErrorsInstrumentation()],
        })
      );

      const errorWithoutStack = new Error('No stack');
      errorWithoutStack.stack = undefined;

      expect(() => errorHandler(errorWithoutStack, false)).not.toThrow();
      expect(transport.items).toHaveLength(1);
    });
  });
});
