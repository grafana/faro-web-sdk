import { isFunction, isString, Observable } from '@grafana/faro-core';

import { isUrlIgnored } from '../../utils/url';

import { MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from './const';
import type { HttpRequestEndMessage, HttpRequestStartMessage } from './types';

/**
 * Monitors if any http requests are in progress.
 */
export function monitorHttpRequests(): Observable {
  const observable = new Observable<HttpRequestStartMessage | HttpRequestEndMessage>();

  let activeXhrRequests = 0;
  let activeFetchRequests = 0;

  function emitMessage() {
    if (activeXhrRequests + activeFetchRequests > 0) {
      observable.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_START });
    } else {
      observable.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_END });
    }
  }

  monitorFetch((active: number) => {
    activeFetchRequests = active;
    emitMessage();
  });

  monitorXhr((active: number) => {
    activeXhrRequests = active;
    emitMessage();
  });

  return observable;
}

function monitorXhr(setActiveCallback: (active: number) => void) {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  let activeRequests = 0;

  XMLHttpRequest.prototype.open = function () {
    const url = arguments[1];
    const isIgnoreUrl = isUrlIgnored(url);

    this.addEventListener('loadstart', () => {
      if (!isIgnoreUrl) {
        activeRequests++;
        setActiveCallback(activeRequests);
      }
    });

    this.addEventListener('loadend', () => {
      if (!isIgnoreUrl) {
        activeRequests--;
        setActiveCallback(activeRequests);
      }
    });

    originalOpen.apply(this, arguments as any);
  };

  XMLHttpRequest.prototype.send = function () {
    originalSend.apply(this, arguments as any);
  };
}

function monitorFetch(setActiveCallback: (active: number) => void) {
  const originalFetch = window.fetch;
  let activeRequests = 0;

  window.fetch = function () {
    const url = getUrlFromResource(arguments[0]);
    const isIgnoreUrl = isUrlIgnored(url);

    // fetch started
    if (!isIgnoreUrl) {
      activeRequests++;
      setActiveCallback(activeRequests);
    }

    return originalFetch.apply(this, arguments as any).finally(() => {
      // fetch ended
      if (!isIgnoreUrl) {
        activeRequests--;
        setActiveCallback(activeRequests);
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
