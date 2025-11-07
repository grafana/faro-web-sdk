import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from './const';
import { __resetHttpRequestMonitorForTests, monitorHttpRequests } from './httpRequestMonitor';

describe('monitorHttpRequests', () => {
  afterEach(() => {
    __resetHttpRequestMonitorForTests();
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Monitors xhr requests and sends a message if request are pending', async () => {
    const url = 'https://www.grafana.com';

    // Store the original send method to restore later
    const originalSend = XMLHttpRequest.prototype.send;

    // Mock the send method to avoid actual network calls
    XMLHttpRequest.prototype.send = function () {
      // Trigger loadstart event
      const loadStartEvent = new Event('loadstart');
      this.dispatchEvent(loadStartEvent);

      // Simulate async response
      setTimeout(() => {
        // Set readyState and status using defineProperty to override readonly
        Object.defineProperty(this, 'readyState', { value: 4, writable: true });
        Object.defineProperty(this, 'status', { value: 200, writable: true });

        // Trigger load event (successful response)
        const loadEvent = new Event('load');
        this.dispatchEvent(loadEvent);

        // Trigger readystatechange for compatibility
        if (this.onreadystatechange) {
          const event = new Event('readystatechange');
          this.onreadystatechange.call(this, event as any);
        }
      }, 0);
    };

    const observable = monitorHttpRequests();
    const mockSubscribe = jest.fn();
    observable.subscribe(mockSubscribe);

    initializeFaro(mockConfig());

    const xhr = new XMLHttpRequest();

    xhr.open('GET', url);

    await new Promise((resolve) => {
      xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          resolve({});
        }
      };
      xhr.send();
    });

    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    expect(mockSubscribe).toHaveBeenNthCalledWith(1, {
      type: MESSAGE_TYPE_HTTP_REQUEST_START,
      request: {
        apiType: 'xhr',
        method: 'GET',
        requestId: expect.any(String),
        url,
      },
    });
    expect(mockSubscribe).toHaveBeenNthCalledWith(2, {
      type: MESSAGE_TYPE_HTTP_REQUEST_END,
      request: {
        apiType: 'xhr',
        method: 'GET',
        requestId: expect.any(String),
        url,
      },
    });

    // Restore original send method
    XMLHttpRequest.prototype.send = originalSend;
  });

  it('Monitors fetch requests and sends a message if request are pending', async () => {
    const originalFetch = global.fetch;

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ key: 'value' }),
      })
    ) as any;

    const observable = monitorHttpRequests();
    const mockSubscribe = jest.fn();
    observable.subscribe(mockSubscribe);

    initializeFaro(mockConfig());

    await fetch('https://www.grafana.com', {
      method: 'GET',
    });

    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    expect(mockSubscribe).toHaveBeenNthCalledWith(1, {
      type: MESSAGE_TYPE_HTTP_REQUEST_START,
      request: {
        apiType: 'fetch',
        method: 'GET',
        requestId: expect.any(String),
        url: 'https://www.grafana.com',
      },
    });
    expect(mockSubscribe).toHaveBeenNthCalledWith(2, {
      type: MESSAGE_TYPE_HTTP_REQUEST_END,
      request: {
        apiType: 'fetch',
        method: 'GET',
        requestId: expect.any(String),
        url: 'https://www.grafana.com',
      },
    });

    global.fetch = originalFetch;
  });

  it('returns the same observable instance on repeated calls', () => {
    const first = monitorHttpRequests();
    const second = monitorHttpRequests();
    expect(second).toBe(first);
  });
});
