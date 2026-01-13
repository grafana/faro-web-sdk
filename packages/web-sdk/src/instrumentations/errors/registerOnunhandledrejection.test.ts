import type { ExceptionEventExtended, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { initializeFaro } from '../../initialize';

import { __resetOnunhandledrejectionForTests, registerOnunhandledrejection } from './registerOnunhandledrejection';

describe('registerOnunhandledrejection', () => {
  afterEach(() => {
    __resetOnunhandledrejectionForTests();
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('will capture unhandled promise rejection', () => {
    const transport = new MockTransport();
    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
      })
    );

    registerOnunhandledrejection(api);

    // Create a custom event that matches the ExtendedPromiseRejectionEvent interface
    const rejectionEvent = new Event('unhandledrejection') as any;
    rejectionEvent.reason = new Error('test rejection');

    window.dispatchEvent(rejectionEvent);

    expect(transport.items).toHaveLength(1);
    expect((transport.items[0] as TransportItem<ExceptionEventExtended>).payload.value).toBe('test rejection');
  });

  describe('behavior with multiple instances', () => {
    it('will notify all SDK instances when an unhandled rejection occurs', () => {
      const transport1 = new MockTransport();
      const { api: api1 } = initializeFaro(
        mockConfig({
          transports: [transport1],
        })
      );

      const transport2 = new MockTransport();
      const { api: api2 } = initializeFaro(
        mockConfig({
          transports: [transport2],
        })
      );

      // Register handlers for both instances
      registerOnunhandledrejection(api1);
      registerOnunhandledrejection(api2);

      // Trigger an unhandled rejection
      // Create a custom event that matches the ExtendedPromiseRejectionEvent interface
      const rejectionEvent = new Event('unhandledrejection') as any;
      rejectionEvent.reason = new Error('test rejection');

      window.dispatchEvent(rejectionEvent);

      // Verify both instances received the event
      expect(transport1.items).toHaveLength(1);
      expect((transport1.items[0] as TransportItem<ExceptionEventExtended>).payload.value).toBe('test rejection');

      expect(transport2.items).toHaveLength(1);
      expect((transport2.items[0] as TransportItem<ExceptionEventExtended>).payload.value).toBe('test rejection');
    });
  });
});
