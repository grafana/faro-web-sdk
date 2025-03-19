import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { MESSAGE_TYPE_HTTP_REQUEST_START } from './const';
import { monitorHttpRequests } from './httpRequestMonitor';

describe('monitorHttpRequests', () => {
  it('Monitors xhr requests and sends a message if request are pending', () => {
    const observable = monitorHttpRequests();
    const mockNotify = jest.fn();
    jest.spyOn(observable, 'notify').mockImplementationOnce(mockNotify);

    initializeFaro(mockConfig());

    const xhr = new XMLHttpRequest();

    xhr.open('GET', 'https://www.grafana.com');
    xhr.send();

    // TODO: loadend event is never called in the jest test. Need to find out why.
    // Normally we should see two calls to notify, one for the start and one for the end of the request.
    // Second call should be for the end of the request.
    // It works in the browser.
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenNthCalledWith(1, { type: MESSAGE_TYPE_HTTP_REQUEST_START });
  });

  it('Monitors fetch requests and sends a message if request are pending', () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ data: 'mocked data' }),
        ok: true,
        status: 200,
      })
    ) as any;

    const observable = monitorHttpRequests();
    const mockNotify = jest.fn();
    jest.spyOn(observable, 'notify').mockImplementationOnce(mockNotify);

    initializeFaro(mockConfig());

    fetch('https://www.grafana.com');

    // TODO: same as above. Works in the browser but and in the code.
    // For example adding console.log message for start and end of the request shows it works.
    // Need to find out why it doesn't work in the test.
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenNthCalledWith(1, { type: MESSAGE_TYPE_HTTP_REQUEST_START });
  });
});
