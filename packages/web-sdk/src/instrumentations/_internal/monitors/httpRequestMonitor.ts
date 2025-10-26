import { genShortID, Observable } from '@grafana/faro-core';

import { getUrlFromResource, isUrlIgnored } from '../../../utils/url';

import { MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from './const';
import type { HttpRequestEndMessage, HttpRequestMessagePayload, HttpRequestStartMessage } from './types';

type RequestProps = HttpRequestMessagePayload;

const apiTypeFetch = 'fetch';
const apiTypeXhr = 'xhr';

/**
 * Monitors if any http requests are in progress.
 */
let httpRequestObservable: Observable<HttpRequestStartMessage | HttpRequestEndMessage> | undefined;
let isInstrumented = false;
let originalXhrOpen: typeof XMLHttpRequest.prototype.open | undefined;
let originalFetchFn: typeof window.fetch | undefined;

export function monitorHttpRequests(): Observable<HttpRequestStartMessage | HttpRequestEndMessage> {
  if (httpRequestObservable) {
    return httpRequestObservable;
  }

  httpRequestObservable = new Observable<HttpRequestStartMessage | HttpRequestEndMessage>();

  function emitStartMessage(requestProps: RequestProps) {
    httpRequestObservable!.notify({
      type: MESSAGE_TYPE_HTTP_REQUEST_START,
      request: requestProps,
    });
  }

  function emitEndMessage(requestProps: RequestProps) {
    httpRequestObservable!.notify({
      type: MESSAGE_TYPE_HTTP_REQUEST_END,
      request: requestProps,
    });
  }

  if (!isInstrumented) {
    monitorFetch({
      onRequestStart: emitStartMessage,
      onRequestEnd: emitEndMessage,
    });

    monitorXhr({
      onRequestStart: emitStartMessage,
      onRequestEnd: emitEndMessage,
    });

    isInstrumented = true;
  }

  return httpRequestObservable;
}

function monitorXhr({
  onRequestStart,
  onRequestEnd,
}: {
  onRequestStart: (props: RequestProps) => void;
  onRequestEnd: (props: RequestProps) => void;
}) {
  if (!originalXhrOpen) {
    originalXhrOpen = XMLHttpRequest.prototype.open;
  }

  XMLHttpRequest.prototype.open = function () {
    const url = arguments[1];
    const isIgnoredUrl = isUrlIgnored(url);
    const method = arguments[0];

    const requestId = genShortID();

    // request has started to load data.
    this.addEventListener('loadstart', function () {
      if (!isIgnoredUrl) {
        onRequestStart({ url, method, requestId, apiType: apiTypeXhr });
      }
    });

    // transaction completes successfully.
    this.addEventListener('load', function () {
      if (!isIgnoredUrl) {
        onRequestEnd({ url, method, requestId, apiType: apiTypeXhr });
      }
    });

    this.addEventListener('error', function () {
      if (!isIgnoredUrl) {
        onRequestEnd({ url, method, requestId, apiType: apiTypeXhr });
      }
    });

    this.addEventListener('abort', function () {
      if (!isIgnoredUrl) {
        onRequestEnd({ url, method, requestId, apiType: apiTypeXhr });
      }
    });
    originalXhrOpen!.apply(this, arguments as any);
  };
}

function monitorFetch({
  onRequestEnd,
  onRequestStart,
}: {
  onRequestStart: (props: RequestProps) => void;
  onRequestEnd: (props: RequestProps) => void;
}) {
  if (!originalFetchFn) {
    originalFetchFn = window.fetch;
  }

  window.fetch = function () {
    const url = getUrlFromResource(arguments[0]) ?? '';
    const isIgnoredUrl = isUrlIgnored(url);
    const method = (arguments[1] ?? {}).method;

    const requestId = genShortID();

    if (!isIgnoredUrl) {
      onRequestStart({ url, method, requestId, apiType: apiTypeFetch });
    }

    return originalFetchFn!
      .apply(this, arguments as any)
      .then((response) => {
        if (!isIgnoredUrl) {
          onRequestEnd({ url, method, requestId, apiType: apiTypeFetch });
        }
        return response;
      })
      .catch((error) => {
        if (!isIgnoredUrl) {
          onRequestEnd({ url, method, requestId, apiType: apiTypeFetch });
        }
        throw error;
      });
  };
}

// Test-only utility to reset instrumentation and singleton between tests
export function __resetHttpRequestMonitorForTests() {
  if (originalXhrOpen) {
    XMLHttpRequest.prototype.open = originalXhrOpen;
  }
  if (originalFetchFn) {
    (window as any).fetch = originalFetchFn;
  }
  httpRequestObservable = undefined;
  isInstrumented = false;
  originalXhrOpen = undefined;
  originalFetchFn = undefined;
}
