import { BaseInstrumentation, faro, globalObject, isString, VERSION } from '@grafana/faro-core';

import {
  faroRumHeader,
  fetchGlobalObjectKey,
  makeFaroRumHeaderValue,
  parseHeaders,
  rejectedFetchEventName,
  resolvedFetchEventName,
  responseProperties,
} from './constants';
import type { FetchInstrumentationOptions } from './types';

// >>> Workarounds because somehow the build uses node typings which causes it build to fail
type WindowFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
function isRequest(input: any): input is Request {
  return input instanceof Request && Boolean(input.url);
}
// <<< Workarounds

export class FetchInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-fetch';
  readonly version = VERSION;
  readonly originalFetch: WindowFetch = window.fetch.bind(globalObject);
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
    return isRequest(input) ? input.url : String(input);
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

    // add Faro RUM header to the request headers
    const windowOrigin = window.location.origin;
    const shouldAddRumHeaderToUrl = shouldPropagateRumHeaders(this.getRequestUrl(input), [
      ...(this.options?.propagateRumHeaderCorsUrls ?? []),
      windowOrigin,
    ]);
    const sessionId = faro.api.getSession()?.id;

    if (shouldAddRumHeaderToUrl && sessionId != null) {
      request.headers.append(faroRumHeader, makeFaroRumHeaderValue(sessionId));
    }

    return { init, request };
  }

  /**
   * Instrument fetch with Faro
   */
  private instrumentFetch(): WindowFetch {
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

export function shouldPropagateRumHeaders(
  url: string,
  propagateRumHeaderCorsUrls: FetchInstrumentationOptions['propagateRumHeaderCorsUrls'] = []
): boolean {
  if (url.startsWith('https://example2.com')) {
    console.log('url :>> ', url);
  }
  return propagateRumHeaderCorsUrls.some((pattern) => {
    if (url.startsWith('https://example2.com')) {
      console.log('pattern :>> ', pattern);
      console.log('return :>> ', isString(pattern) ? url.includes(pattern) : Boolean(url.match(pattern)));
    }

    return isString(pattern) ? url.includes(pattern) : Boolean(url.match(pattern));
  });
}
