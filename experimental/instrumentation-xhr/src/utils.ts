import { isString } from '@grafana/faro-core';

import type { XHRInstrumentationOptions } from './types';

// This code parses the headers from an XMLHttpRequest and returns them as an object.
export const parseXHRHeaders = (context: XMLHttpRequest): Record<string, any> => {
  const headers = context.getAllResponseHeaders().split('\r\n');
  const headerMap: Record<string, any> = {};

  for (const header of headers) {
    const [key, value] = header.split(': ');
    if (key && value) {
      headerMap[`header_${key}`] = value;
    }
  }

  return headerMap;
};

// This code parses the xhr event and returns a record of the request url, response url, bytes loaded, status text, and status code.
export const parseXHREvent = (context: XMLHttpRequest, event: ProgressEvent<EventTarget>): Record<string, any> => {
  // @ts-expect-error - _url is attached to the xhr object in XMLHttpRequest.prototype.open
  const { _url, responseURL, statusText, status } = context;

  return {
    request_url: _url?.toString() ?? '',
    response_url: responseURL?.toString() ?? '',
    bytes_loaded: event.loaded?.toString() ?? '',
    status_text: statusText ?? '',
    status: status?.toString() ?? '',
  };
};

export function shouldPropagateRumHeaders(
  url: string,
  propagateRumHeaderCorsUrls: XHRInstrumentationOptions['propagateRumHeaderCorsUrls'] = []
): boolean {
  return propagateRumHeaderCorsUrls.some((pattern) => {
    return isString(pattern) ? url.includes(pattern) : Boolean(url.match(pattern));
  });
}
