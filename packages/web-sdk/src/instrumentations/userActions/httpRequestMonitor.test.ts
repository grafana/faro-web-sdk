import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from './const';
import { monitorHttpRequests } from './httpRequestMonitor';

describe('monitorHttpRequests', () => {
  beforeEach(() => {});

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Monitors xhr requests and sends a message if request are pending', async () => {
    const observable = monitorHttpRequests();
    const mockSubscribe = jest.fn();
    observable.subscribe(mockSubscribe);

    initializeFaro(mockConfig());

    const xhr = new XMLHttpRequest();

    xhr.open('GET', 'https://www.grafana.com');

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
        url: 'https://www.grafana.com',
      },
    });
    expect(mockSubscribe).toHaveBeenNthCalledWith(2, {
      type: MESSAGE_TYPE_HTTP_REQUEST_END,
      request: {
        apiType: 'xhr',
        method: 'GET',
        requestId: expect.any(String),
        url: 'https://www.grafana.com',
      },
    });
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
});
