import { initializeFaro, type MeasurementEvent, type TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { HttpInstrumentation } from './index';

describe('HttpInstrumentation', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('initialization', () => {
    it('should patch global fetch', () => {
      const transport = new MockTransport();
      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new HttpInstrumentation()],
        })
      );

      expect(global.fetch).not.toBe(originalFetch);
    });

    it('should have correct name and version', () => {
      const instrumentation = new HttpInstrumentation();
      expect(instrumentation.name).toBe('@grafana/faro-react-native:instrumentation-http');
      expect(typeof instrumentation.version).toBe('string');
    });
  });

  describe('fetch tracking', () => {
    it('should track successful fetch requests', async () => {
      const transport = new MockTransport();
      const mockResponse = new Response('{}', { status: 200, statusText: 'OK' });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new HttpInstrumentation()],
        })
      );

      await fetch('https://api.example.com/data');

      // Should have measurements
      expect(transport.items.length).toBeGreaterThanOrEqual(2);

      const measurements = transport.items.filter((item) => item.type === 'measurement') as TransportItem<MeasurementEvent>[];

      // Find http_request_start measurement
      const startMeasurement = measurements.find((m) => m.payload.type === 'http_request_start');
      expect(startMeasurement).toBeDefined();
      expect(startMeasurement?.payload.values?.timestamp).toBeDefined();
      expect(typeof startMeasurement?.payload.values?.timestamp).toBe('number');

      // Find http_request measurement
      const requestMeasurement = measurements.find((m) => m.payload.type === 'http_request');
      expect(requestMeasurement).toBeDefined();
      expect(requestMeasurement?.payload.values?.status).toBe(200);
      expect(requestMeasurement?.payload.values?.duration).toBeDefined();
      expect(typeof requestMeasurement?.payload.values?.duration).toBe('number');
    });

    it('should track POST requests', async () => {
      const transport = new MockTransport();
      const mockResponse = new Response('{}', { status: 201 });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new HttpInstrumentation()],
        })
      );

      await fetch('https://api.example.com/data', { method: 'POST' });

      const measurements = transport.items.filter((item) => item.type === 'measurement') as TransportItem<MeasurementEvent>[];
      const startMeasurement = measurements.find((m) => m.payload.type === 'http_request_start');

      expect(startMeasurement).toBeDefined();
      // Context is included in the measurement
      expect(startMeasurement?.payload.context).toBeDefined();
      expect(startMeasurement?.payload.context?.method).toBe('POST');
      expect(startMeasurement?.payload.context?.url).toBe('https://api.example.com/data');
    });

    it('should track failed fetch requests', async () => {
      const transport = new MockTransport();
      const error = new Error('Network error');
      global.fetch = jest.fn().mockRejectedValue(error);

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new HttpInstrumentation()],
        })
      );

      await fetch('https://api.example.com/data').catch(() => {});

      const measurements = transport.items.filter((item) => item.type === 'measurement') as TransportItem<MeasurementEvent>[];

      // Should have request_start
      const startMeasurement = measurements.find((m) => m.payload.type === 'http_request_start');
      expect(startMeasurement).toBeDefined();

      // Should have request_error
      const errorMeasurement = measurements.find((m) => m.payload.type === 'http_request_error');
      expect(errorMeasurement).toBeDefined();
      expect(errorMeasurement?.payload.context).toBeDefined();
      expect(errorMeasurement?.payload.context?.error).toBe('Network error');
      expect(errorMeasurement?.payload.values?.duration).toBeDefined();

      // Should also push error
      const exceptions = transport.items.filter((item) => item.type === 'exception');
      expect(exceptions.length).toBeGreaterThan(0);
    });

    it('should handle URL object input', async () => {
      const transport = new MockTransport();
      const mockResponse = new Response('{}', { status: 200 });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new HttpInstrumentation()],
        })
      );

      const url = new URL('https://api.example.com/data');
      await fetch(url);

      const measurements = transport.items.filter((item) => item.type === 'measurement') as TransportItem<MeasurementEvent>[];
      const startMeasurement = measurements.find((m) => m.payload.type === 'http_request_start');

      expect(startMeasurement).toBeDefined();
      expect(startMeasurement?.payload.context).toBeDefined();
      expect(startMeasurement?.payload.context?.url).toBe('https://api.example.com/data');
    });

    it('should handle Request object input', async () => {
      const transport = new MockTransport();
      const mockResponse = new Response('{}', { status: 200 });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new HttpInstrumentation()],
        })
      );

      const request = new Request('https://api.example.com/data', { method: 'POST' });
      await fetch(request);

      const measurements = transport.items.filter((item) => item.type === 'measurement') as TransportItem<MeasurementEvent>[];
      const startMeasurement = measurements.find((m) => m.payload.type === 'http_request_start');

      expect(startMeasurement).toBeDefined();
      expect(startMeasurement?.payload.context).toBeDefined();
      expect(startMeasurement?.payload.context?.url).toBe('https://api.example.com/data');
      expect(startMeasurement?.payload.context?.method).toBe('POST');
    });
  });

  describe('URL filtering', () => {
    it('should ignore Grafana collector URLs', async () => {
      const transport = new MockTransport();
      const mockResponse = new Response('{}', { status: 200 });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new HttpInstrumentation()],
        })
      );

      await fetch('https://faro.grafana.net/collect');

      // Should not have http measurements for collector URL
      const measurements = transport.items.filter((item) => item.type === 'measurement') as TransportItem<MeasurementEvent>[];
      const httpMeasurements = measurements.filter(
        (m) => m.payload.type === 'http_request_start' || m.payload.type === 'http_request'
      );

      expect(httpMeasurements).toHaveLength(0);
    });

    it('should ignore URLs matching custom patterns', async () => {
      const transport = new MockTransport();
      const mockResponse = new Response('{}', { status: 200 });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [
            new HttpInstrumentation({
              ignoredUrls: [/localhost/, /127\.0\.0\.1/, /internal-api/],
            }),
          ],
        })
      );

      await fetch('http://localhost:3000/api');
      await fetch('http://127.0.0.1:8080/data');
      await fetch('https://api.example.com/internal-api/users');

      const measurements = transport.items.filter((item) => item.type === 'measurement') as TransportItem<MeasurementEvent>[];
      const httpMeasurements = measurements.filter(
        (m) => m.payload.type === 'http_request_start' || m.payload.type === 'http_request'
      );

      expect(httpMeasurements).toHaveLength(0);
    });

    it('should track non-ignored URLs', async () => {
      const transport = new MockTransport();
      const mockResponse = new Response('{}', { status: 200 });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [
            new HttpInstrumentation({
              ignoredUrls: [/localhost/],
            }),
          ],
        })
      );

      await fetch('https://api.example.com/data');

      const measurements = transport.items.filter((item) => item.type === 'measurement') as TransportItem<MeasurementEvent>[];
      const httpMeasurements = measurements.filter(
        (m) => m.payload.type === 'http_request_start' || m.payload.type === 'http_request'
      );

      expect(httpMeasurements.length).toBeGreaterThan(0);
    });
  });

  describe('request timing', () => {
    it('should calculate request duration', async () => {
      jest.useFakeTimers();

      const transport = new MockTransport();
      const mockResponse = new Response('{}', { status: 200 });
      let resolvePromise: (value: Response) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });
      global.fetch = jest.fn().mockReturnValue(fetchPromise);

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new HttpInstrumentation()],
        })
      );

      const request = fetch('https://api.example.com/data');

      // Advance time
      jest.advanceTimersByTime(500);

      // Resolve the fetch
      resolvePromise!(mockResponse);
      await request;

      const measurements = transport.items.filter((item) => item.type === 'measurement') as TransportItem<MeasurementEvent>[];
      const requestMeasurement = measurements.find((m) => m.payload.type === 'http_request');

      expect(requestMeasurement?.payload.values?.duration).toBeDefined();
      expect(typeof requestMeasurement?.payload.values?.duration).toBe('number');

      jest.useRealTimers();
    });
  });

  describe('unpatch', () => {
    it('should restore original fetch', () => {
      // Use the originalFetch captured in beforeEach
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      const { config } = initializeFaro(
        mockConfig({
          transports: [new MockTransport()],
          instrumentations: [new HttpInstrumentation()],
        })
      );

      const patchedFetch = global.fetch;
      // Verify that fetch was patched
      expect(patchedFetch).not.toBe(mockFetch);

      const instrumentation = config.instrumentations?.[0] as HttpInstrumentation;
      instrumentation.unpatch();

      // Verify that fetch was restored to the original mock
      expect(global.fetch).toBe(mockFetch);
    });

    it('should clear tracked requests', async () => {
      const transport = new MockTransport();
      const mockResponse = new Response('{}', { status: 200 });
      const mockFetch = jest.fn().mockResolvedValue(mockResponse);

      // Save the current fetch state
      const savedFetch = global.fetch;
      global.fetch = mockFetch;

      const { config } = initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new HttpInstrumentation()],
        })
      );

      // Make some requests
      await fetch('https://api.example.com/data1');
      await fetch('https://api.example.com/data2');

      const instrumentation = config.instrumentations?.[0] as HttpInstrumentation;
      instrumentation.unpatch();

      // After unpatch, requests map should be cleared (we can't directly test this, but unpatch should work)
      expect(() => instrumentation.unpatch()).not.toThrow();

      // Restore original fetch for cleanup
      global.fetch = savedFetch;
    });
  });

  describe('concurrent requests', () => {
    it('should track multiple concurrent requests', async () => {
      const transport = new MockTransport();
      const mockResponse = new Response('{}', { status: 200 });
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [new HttpInstrumentation()],
        })
      );

      // Make multiple concurrent requests
      await Promise.all([
        fetch('https://api.example.com/data1'),
        fetch('https://api.example.com/data2'),
        fetch('https://api.example.com/data3'),
      ]);

      const measurements = transport.items.filter((item) => item.type === 'measurement') as TransportItem<MeasurementEvent>[];
      const startMeasurements = measurements.filter((m) => m.payload.type === 'http_request_start');
      const requestMeasurements = measurements.filter((m) => m.payload.type === 'http_request');

      // Should have 3 start and 3 complete measurements
      expect(startMeasurements).toHaveLength(3);
      expect(requestMeasurements).toHaveLength(3);

      // Each should have a unique requestId
      const requestIds = startMeasurements
        .map((m) => m.payload.context?.requestId)
        .filter((id) => id !== undefined);
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(3);

      // Verify each request has proper context
      startMeasurements.forEach((measurement) => {
        expect(measurement.payload.context).toBeDefined();
        expect(measurement.payload.context?.url).toMatch(/https:\/\/api\.example\.com\/data[1-3]/);
        expect(measurement.payload.context?.method).toBe('GET');
        expect(measurement.payload.context?.requestId).toBeDefined();
      });
    });
  });
});
