import { BaseInstrumentation, faro, VERSION } from '@grafana/faro-core';

import { XHREventType, XHRInstrumentationOptions } from './types';
import { parseXHREvent, parseXHRHeaders } from './utils';

export class XHRInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-xhr';
  readonly version = VERSION;
  readonly originalOpen: XMLHttpRequest['open'] = XMLHttpRequest.prototype.open;
  readonly originalSend: XMLHttpRequest['send'] = XMLHttpRequest.prototype.send;
  private ignoredUrls: XHRInstrumentationOptions['ignoredUrls'];

  constructor(private options?: XHRInstrumentationOptions) {
    super();
  }

  /**
   * Initialize XMLHttpRequest instrumentation - XMLHttpRequest.prototype.open and XMLHttpRequest.prototype.send become instrumented
   * and event listeners are added to the XMLHttpRequest instance
   */
  initialize(): void {
    this.internalLogger.info('Initializing XHR instrumentation');
    this.ignoredUrls = this.options?.ignoredUrls ?? this.getTransportIgnoreUrls();
    const instrumentation = this;

    /**
     * XMLHttpRequest.prototype.open becomes instrumented and the parameter defaults are properly passed to the original function
     */
    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ): void {
      const xhr = this;

      // @ts-expect-error - _url is attached to the xhr object
      xhr._url = url;

      return instrumentation.originalOpen?.apply(xhr, [
        method,
        url,
        async === undefined ? true : !!async,
        username === undefined ? null : username,
        password === undefined ? null : password,
      ]);
    };

    /**
     * XMLHttpRequest.prototype.send becomes instrumented and the parameter defaults are properly passed to the original function
     */
    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null | undefined): void {
      const xhr = this;
      // @ts-expect-error - _url is attached to the xhr object
      const requestUrl = xhr._url;

      // If the request url matches an ignored url, do not instrument the request
      if (instrumentation.ignoredUrls?.some((ignoredUrl) => instrumentation.getRequestUrl(requestUrl).match(ignoredUrl))) {
        return instrumentation.originalSend?.apply(xhr, [body === undefined ? null : body]);
      }

      xhr.addEventListener('load', loadEventListener.bind(xhr));
      xhr.addEventListener('abort', abortEventListener.bind(xhr));
      xhr.addEventListener('error', errorEventListener.bind(xhr));
      xhr.addEventListener('timeout', timeoutEventListener.bind(xhr));

      return instrumentation.originalSend?.apply(xhr, [body === undefined ? null : body]);
    };

    /**
     * Event listener function that is called when an XHR request is successfully completed.
     * Pushes a log entry to the Faro API with information about the completed request.
     * Removes the event listener to prevent duplicate log entries.
     */
    function loadEventListener(this: XMLHttpRequest, event: ProgressEvent<EventTarget>) {
      faro.api.pushEvent(XHREventType.LOAD, {
        ...parseXHREvent(this, event),
        ...parseXHRHeaders(this)
      });

      this.removeEventListener('load', loadEventListener);
    }
    /**
     * Event listener function that is called when an XHR request is aborted.
     * Pushes a log entry to the Faro API with information about the aborted request.
     * Removes the event listener to prevent duplicate log entries.
     */
    function abortEventListener(this: XMLHttpRequest, event: ProgressEvent<EventTarget>) {
      faro.api.pushEvent(XHREventType.ABORT, {
        ...parseXHREvent(this, event),
        ...parseXHRHeaders(this)
      });

      this.removeEventListener('abort', abortEventListener);
    }

    /**
     * Event listener function that is called when an XHR request encounters an error.
     * Pushes a log entry to the Faro API with information about the errored request.
     * Removes the event listener to prevent duplicate log entries.
     */
    function errorEventListener(this: XMLHttpRequest, event: ProgressEvent<EventTarget>) {
      faro.api.pushEvent(XHREventType.ERROR, {
        ...parseXHREvent(this, event),
        ...parseXHRHeaders(this)
      });

      this.removeEventListener('error', errorEventListener);
    }

    /**
     * Event listener function that is called when an XHR request times out.
     * Pushes a log entry to the Faro API with information about the timed out request.
     * Removes the event listener to prevent duplicate log entries.
     */
    function timeoutEventListener(this: XMLHttpRequest, event: ProgressEvent<EventTarget>) {
      faro.api.pushEvent(XHREventType.TIMEOUT, {
        ...parseXHREvent(this, event),
        ...parseXHRHeaders(this)
      });

      this.removeEventListener('timeout', timeoutEventListener);
    }
  }

  /**
   * Get the list of ignored urls from all transports
   */
  private getTransportIgnoreUrls(): Array<string | RegExp> {
    return faro?.transports?.transports?.flatMap((transport) => transport.getIgnoreUrls());
  }

  /**
   * Get the list of ignored urls from all transports
   */
  getIgnoredUrls(): Array<string | RegExp> {
    return this.ignoredUrls ?? [];
  }

  /**
   * Parse the input object into a string URL
   */
  getRequestUrl(input: string | URL): string {
    return input instanceof URL ? input.href : String(input);
  }
}
