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
  VERSION,
} from './constants';
import type { FetchInstrumentationOptions } from './types';

export class FetchInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-fetch';
  readonly version = VERSION;
  readonly ignoredUrls: FetchInstrumentationOptions['ignoredUrls'];

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
      value: this.instrumentFetch(),
    });

    Object.defineProperty(globalObject, originalFetchGlobalObjectKey, {
      configurable: true,
      enumerable: false,
      writable: false,
      value: originalFetch,
    });
  }

  /**
   * Generate a unique request id object for each fetch request
   */
  private requestId(idOnly?: boolean): Record<string, string> | string {
    const requestId = (faro.config.session?.id ?? faro.config.user?.id) + Date.now().toString();
    return idOnly ? requestId : { request_id: requestId };
  }

  /**
   * Instrument fetch with Faro
   */
  private instrumentFetch(): typeof fetch {
    const instrumentation = this;
    return function fetch(this: typeof globalObject, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const requestUrl = input instanceof Request ? input.url : String(input);

      // if the url is in the ignoredUrls list, skip instrumentation
      if (instrumentation.ignoredUrls?.some((url) => requestUrl.match(url))) {
        instrumentation.internalLogger.info(
          `Skipping fetch instrumentation for ignored url "${requestUrl}" - using default fetch`
        );
        return originalFetch(input, init);
      }

      const initClone = init ? Object.assign({}, init) : {};

      let body;
      if (initClone && initClone.body) {
        body = initClone.body;
        initClone.body = undefined;
      }

      let headers;
      if (initClone && initClone.headers) {
        headers = new Headers(initClone.headers);
        headers.append('x-faro-request-id', instrumentation.requestId(true) as string);
        initClone.headers = headers;
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
              ...(instrumentation.requestId() as Record<string, string>),
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
       */
      function reject(rej: (reason?: unknown) => void, error: Error) {
        try {
          faro.api.pushEvent(
            rejectedFetchEventName,
            {
              failed: 'true',
              error: error.message,
              ...(instrumentation.requestId() as Record<string, string>),
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
          .then(resolve.bind(self, originalResolve), reject.bind(self, originalReject));
      });
    };
  }
}
