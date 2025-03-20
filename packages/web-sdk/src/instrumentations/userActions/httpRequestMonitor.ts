import { isFunction, isString, Observable } from '@grafana/faro-core';

import { isUrlIgnored } from '../../utils/url';

import { MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from './const';
import type { HttpRequestEndMessage, HttpRequestStartMessage } from './types';

/**
 * Monitors if any http requests are in progress.
 */
export function monitorHttpRequests(): Observable {
  const observable = new Observable<HttpRequestStartMessage | HttpRequestEndMessage>();

  let pendingXhrRequests = 0;
  let pendingFetchRequests = 0;

  function emitStartMessage() {
    observable.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_START, pending: pendingXhrRequests + pendingFetchRequests });
  }

  function emitEndMessage() {
    observable.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_END, pending: pendingXhrRequests + pendingFetchRequests });
  }

  monitorFetch(
    () => {
      pendingFetchRequests++;
      emitStartMessage();
    },
    () => {
      pendingFetchRequests--;
      emitEndMessage();
    }
  );

  monitorXhr(
    () => {
      pendingXhrRequests++;
      emitStartMessage();
    },
    () => {
      pendingXhrRequests--;
      emitEndMessage();
    }
  );

  return observable;
}

function monitorXhr(onRequestStart: () => void, onRequestEnd: () => void) {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function () {
    const url = arguments[1];
    const isIgnoredUrl = isUrlIgnored(url);

    this.addEventListener('loadstart', () => {
      if (!isIgnoredUrl) {
        onRequestStart();
      }
    });

    this.addEventListener('loadend', () => {
      if (!isIgnoredUrl) {
        onRequestEnd();
      }
    });

    originalOpen.apply(this, arguments as any);
  };

  XMLHttpRequest.prototype.send = function () {
    originalSend.apply(this, arguments as any);
  };
}

function monitorFetch(onRequestsStart: () => void, onRequestEnd: () => void) {
  const originalFetch = window.fetch;

  window.fetch = function () {
    const url = getUrlFromResource(arguments[0]);
    const isIgnoredUrl = isUrlIgnored(url);

    // fetch started
    if (!isIgnoredUrl) {
      onRequestsStart();
    }

    return originalFetch.apply(this, arguments as any).finally(() => {
      // fetch ended
      if (!isIgnoredUrl) {
        onRequestEnd();
      }
    });
  };
}

function getUrlFromResource(resource: any): string | undefined {
  if (isString(resource)) {
    return resource;
  } else if (resource instanceof URL) {
    return resource.href;
  } else if (isFunction(resource?.toString)) {
    return resource.toString();
  }
  return undefined;
}
