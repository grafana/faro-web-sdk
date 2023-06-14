import { BaseInstrumentation, faro, globalObject, VERSION } from '@grafana/faro-core';

import {
  fetchGlobalObjectKey,
  parseHeaders,
  rejectedFetchEventName,
  resolvedFetchEventName,
  responseProperties,
} from './constants';
import type { FetchInstrumentationOptions } from './types';

export class FetchInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-fetch';
  readonly version = VERSION;
  readonly originalFetch = fetch.bind(globalObject);
  private ignoredUrls: FetchInstrumentationOptions['ignoredUrls'];

  constructor(private options?: FetchInstrumentationOptions) {
    super();
  }

  /**
   * Initialize fetch instrumentation - globalObject.fetch becomes instrumented fetch, assign original fetch to globalObject.originalFetch
   */
  initialize(): void {
    this.internalLogger.info('Initializing fetch instrumentation');
    this.ignoredUrls = this.options?.ignoredUrls ?? this.getTransportIgnoreUrls();

    Object.defineProperty(globalObject, fetchGlobalObjectKey, {
      configurable: true,
      writable: this.options?.testing ? true : false, // necessary for testing, instrumented fetch should not be writeable by default
      value: this.instrumentFetch().bind(this),
    });
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
  getRequestUrl(input: RequestInfo | URL): string {
    return input instanceof Request ? input.url : String(input);
  }

  /**
   * Build new init and request from the original parameters to fetch
   */
  buildRequestAndInit(input: RequestInfo | URL, init?: RequestInit): { init?: RequestInit; request: Request } {
    const initCopy = init ? Object.assign({}, init) : {};

    let body;
    if (initCopy && initCopy.body) {
      body = initCopy.body;
      initCopy.body = undefined;
    }

    let headers;
    if (initCopy && initCopy.headers) {
      headers = new Headers(initCopy.headers);
      initCopy.headers = headers;
    }

    const request = new Request(input, initCopy);
    if (body) {
      initCopy.body = body;
    }

    return { init, request };
  }

  /**
   * Instrument fetch with Faro
   */
  private instrumentFetch(): typeof fetch {
    const instrumentation = this;
    return function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const requestUrl = instrumentation.getRequestUrl(input);

      // if the url is in the ignoredUrls list, skip instrumentation
      if (instrumentation.ignoredUrls?.some((url) => requestUrl.match(url))) {
        instrumentation.internalLogger.info(
          `Skipping fetch instrumentation for ignored url "${requestUrl}" - using default fetch`
        );
        return instrumentation.originalFetch(input, init);
      }

      const { request, init: initCopy } = instrumentation.buildRequestAndInit(input, init);

      /**
       * Resolve the fetch promise and push the event to Faro
       */
      function resolve(res: (value: Response | PromiseLike<Response>) => void, response: Response) {
        try {
          const parsedHeaders = parseHeaders(response.headers);
          const trimmedResponse = responseProperties(response);

          faro.api.pushEvent(resolvedFetchEventName, {
            ...trimmedResponse,
            ...parsedHeaders,
          });
        } finally {
          res(response);
        }
      }

      /**
       * Reject the fetch promise and push the event to Faro
       */
      function reject(rej: (reason?: unknown) => void, error: Error) {
        try {
          faro.api.pushEvent(rejectedFetchEventName, {
            failed: 'true',
            error: error.message,
          });
        } finally {
          rej(error);
        }
      }

      /**
       * Return a promise that resolves/rejects the original fetch promise
       */
      return new Promise((originalResolve, originalReject) => {
        return instrumentation.originalFetch
          .apply(self, [request, initCopy])
          .then(resolve.bind(self, originalResolve), reject.bind(self, originalReject));
      });
    };
  }
}
