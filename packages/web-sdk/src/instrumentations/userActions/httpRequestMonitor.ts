import { Observable } from '@grafana/faro-core';

import { getUrlFromResource, isUrlIgnored } from '../../utils/url';

import { MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from './const';
import type { HttpRequestEndMessage, HttpRequestStartMessage } from './types';

/**
 * Monitors if any http requests are in progress.
 */
export function monitorHttpRequests(): {
  observable: Observable<HttpRequestStartMessage | HttpRequestEndMessage>;
  resetCounters: () => void;
} {
  const observable = new Observable<HttpRequestStartMessage | HttpRequestEndMessage>();

  let pendingXhrRequests = 0;
  let pendingFetchRequests = 0;

  function emitStartMessage() {
    observable.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_START, pending: pendingXhrRequests + pendingFetchRequests });
  }

  function emitEndMessage() {
    observable.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_END, pending: pendingXhrRequests + pendingFetchRequests });
  }

  monitorFetch({
    onRequestStart: () => {
      pendingFetchRequests++;
      emitStartMessage();
    },
    onRequestEnd: () => {
      pendingFetchRequests--;
      emitEndMessage();
    },
  });

  monitorXhr({
    onRequestStart: () => {
      pendingXhrRequests++;
      emitStartMessage();
    },
    onRequestEnd: () => {
      pendingXhrRequests--;
      emitEndMessage();
    },
  });

  function resetCounters() {
    pendingXhrRequests = 0;
    pendingFetchRequests = 0;
  }

  return { observable, resetCounters };
}

function monitorXhr({ onRequestStart, onRequestEnd }: { onRequestStart: () => void; onRequestEnd: () => void }) {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function () {
    const url = arguments[1];
    const isIgnoredUrl = isUrlIgnored(url);

    this.addEventListener('load', function () {
      if (!isIgnoredUrl) {
        onRequestEnd();
      }
    });

    this.addEventListener('error', function () {
      if (!isIgnoredUrl) {
        onRequestEnd();
      }
    });

    this.addEventListener('abort', function () {
      if (!isIgnoredUrl) {
        onRequestEnd();
      }
    });

    originalOpen.apply(this, arguments as any);
  };

  XMLHttpRequest.prototype.send = function () {
    const url = getUrlFromResource(arguments[0]);

    console.log('url', url);

    const isIgnoredUrl = isUrlIgnored(url);

    if (!isIgnoredUrl) {
      onRequestStart();
    }

    originalSend.apply(this, arguments as any);
  };
}

function monitorFetch({ onRequestEnd, onRequestStart }: { onRequestStart: () => void; onRequestEnd: () => void }) {
  const originalFetch = window.fetch;

  window.fetch = function () {
    const url = getUrlFromResource(arguments[0]);
    const isIgnoredUrl = isUrlIgnored(url);

    if (!isIgnoredUrl) {
      onRequestStart();
    }

    return originalFetch
      .apply(this, arguments as any)
      .then((response) => {
        if (!isIgnoredUrl) {
          onRequestEnd();
        }
        return response;
      })
      .catch((error) => {
        if (!isIgnoredUrl) {
          onRequestEnd();
        }
        throw error;
      });
  };
}
