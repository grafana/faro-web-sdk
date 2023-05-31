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

export class FetchInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-fetch';
  readonly version = '1.0.0'; // TODO - pull from package.json

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
    return function fetch(this: typeof globalObject, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const self = this;
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
          .then(resolve.bind(self, originalResolve), reject.bind(self, originalReject));
      });
    };
  }
}
