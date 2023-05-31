import { BaseInstrumentation, faro, globalObject } from '@grafana/faro-core';

import {
  eventDomain,
  fetchGlobalObjectKey,
  originalFetch,
  originalFetchGlobalObjectKey,
  parseHeaders,
  rejectedFetchEventName,
  resolvedFetchEventName,
  responseProperties,
} from './constants';
import type { FetchInstrumentationOptions } from './types';

export class FetchInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-fetch';
  readonly version = '1.0.0'; // TODO - pull from package.json

  private ignoredUrls: FetchInstrumentationOptions['ignoredUrls'];

  constructor(options?: FetchInstrumentationOptions) {
    super();

    this.ignoredUrls = options?.ignoredUrls ?? [];
  }

  /**
   * Initialize fetch instrumentation - globalObject.fetch becomes instrumented fetch, assign original fetch to globalObject.originalFetch
   */
  initialize(): void {
    this.internalLogger.info('Initializing fetch instrumentation');

    Object.defineProperty(globalObject, fetchGlobalObjectKey, {
      configurable: true,
      enumerable: false,
      writable: false,
      value: this._instrumentFetch(),
    });

    Object.defineProperty(globalObject, originalFetchGlobalObjectKey, {
      configurable: true,
      enumerable: false,
      writable: false,
      value: originalFetch,
    });
  }

  /**
   * Instrument fetch with Faro
   */
  private _instrumentFetch(): typeof fetch {
    const instrumentation = this;
    return function fetch(this: typeof globalObject, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const requestUrl = input instanceof Request ? input.url : String(input);

      // if the url is in the ignoredUrls list, skip instrumentation
      if (instrumentation.ignoredUrls?.some((url) => requestUrl.match(url))) {
        instrumentation.internalLogger.info(`Skipping fetch instrumentation for ignored url "${requestUrl}"`);
        return originalFetch(input, init);
      }

      let initClone = init ? Object.assign({}, init) : {};

      let body;
      if (initClone && initClone.body) {
        body = initClone.body;
        initClone.body = undefined;
      }

      const request = new Request(input, initClone);
      if (body) {
        initClone.body = body;
      }

      /**
       * Resolve the fetch promise and push the event to Faro
       */
      function resolve(res: (value: Response | PromiseLike<Response>) => void, response: Response) {
        try {
          const parsedHeaders = parseHeaders(response.headers);
          const trimmedResponse = responseProperties(response);

          faro.api.pushEvent(
            resolvedFetchEventName,
            {
              ...trimmedResponse,
              ...parsedHeaders,
            },
            eventDomain,
            {
              skipDedupe: true,
            }
          );
        } finally {
          res(response);
        }
      }

      /**
       * Reject the fetch promise and push the event to Faro
       * TODO - this currently doesn't seem to do anything. Figure out why.
       */
      function reject(rej: (reason?: unknown) => void, error: Error) {
        try {
          faro.api.pushEvent(
            rejectedFetchEventName,
            {
              failed: 'true'
            },
            eventDomain,
            {
              skipDedupe: true,
            }
          );
        } finally {
          rej(error);
        }
      }

      /**
       * Return a promise that resolves/rejects the original fetch promise
       */
      return new Promise((originalResolve, originalReject) => {
        return originalFetch
          .apply(self, [request, initClone])
          // TODO - testing to see how to handle reject/resolve and instrumenting both
          .then(resolve.bind(self, originalResolve), reject.bind(self, originalReject));
      });
    };
  }
}
