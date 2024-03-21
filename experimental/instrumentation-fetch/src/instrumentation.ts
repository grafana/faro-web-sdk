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
        let observer: PerformanceObserver | null;

        try {
          const parsedHeaders = parseHeaders(response.headers);
          const trimmedResponse = responseProperties(response);
          const { status, status_text } = trimmedResponse;

          observer = new PerformanceObserver((observedEntries) => {
            const entries = observedEntries.getEntries();

            for (const resourceEntry of entries) {
              const resource = resourceEntry.toJSON();

              if (instrumentation.ignoredUrls?.some((url) => resource.name === url)) {
                continue;
              }

              if (resource.initiatorType === 'fetch') {
                console.log('resource.fetch :>> ', resource);

                const faroResourceTimings = calculateFaroResourceTimings(resource);
                console.log('faroResourceTimings :>> ', faroResourceTimings);

                faro.api.pushEvent(resolvedFetchEventName, {
                  status,
                  status_text,
                  ...parsedHeaders,
                  ...faroResourceTimings,
                });

                if (observer != null) {
                  observer.disconnect();
                  observer = null;
                }
              }
            }
          });

          observer.observe({
            type: 'resource',
          });

          // faro.api.pushEvent(resolvedFetchEventName, {
          //   ...trimmedResponse,
          //   ...parsedHeaders,
          // });
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
  return propagateRumHeaderCorsUrls.some((pattern) => {
    return isString(pattern) ? url.includes(pattern) : Boolean(url.match(pattern));
  });
}

// TODO: ==== the code below part of the web-sdks performance utils

export type FaroResourceTiming = Readonly<{
  fetchTime: string;
  serviceWorkerProcessingTime: string;
  requestTime: string;
  responseTime: string;
  tcpHandshakeTime: string;
  tlsNegotiationTime: string;
  appCache: string;
  redirectLookupTime: string;
  dnsLookupTime: string;
  transferSize: string;
  decodedBodySize: string;
  encodedBodySize: string;
  isCached: string;
}>;

function calculateFaroResourceTimings(resourceEntryRaw: PerformanceResourceTiming): FaroResourceTiming {
  return {
    encodedBodySize: toFaroPerformanceTimingString(resourceEntryRaw.encodedBodySize),
    decodedBodySize: toFaroPerformanceTimingString(resourceEntryRaw.decodedBodySize),
    isCached: toFaroPerformanceTimingString(
      resourceEntryRaw.transferSize === 0 && resourceEntryRaw.decodedBodySize > 0
    ),
    transferSize: toFaroPerformanceTimingString(resourceEntryRaw.transferSize),

    redirectLookupTime: toFaroPerformanceTimingString(resourceEntryRaw.redirectEnd - resourceEntryRaw.redirectStart),
    serviceWorkerProcessingTime: toFaroPerformanceTimingString(
      resourceEntryRaw.fetchStart - resourceEntryRaw.workerStart
    ),
    appCache: toFaroPerformanceTimingString(resourceEntryRaw.domainLookupStart - resourceEntryRaw.fetchStart),
    dnsLookupTime: toFaroPerformanceTimingString(resourceEntryRaw.domainLookupEnd - resourceEntryRaw.domainLookupStart),
    tcpHandshakeTime: toFaroPerformanceTimingString(resourceEntryRaw.connectEnd - resourceEntryRaw.connectStart),
    tlsNegotiationTime: toFaroPerformanceTimingString(
      resourceEntryRaw.requestStart - resourceEntryRaw.secureConnectionStart
    ),
    requestTime: toFaroPerformanceTimingString(resourceEntryRaw.responseStart - resourceEntryRaw.requestStart),
    responseTime: toFaroPerformanceTimingString(resourceEntryRaw.responseEnd - resourceEntryRaw.responseStart),
    fetchTime: toFaroPerformanceTimingString(resourceEntryRaw.responseEnd - resourceEntryRaw.fetchStart),

    // // @ts-expect-error the renderBlocking property is not available in all browsers
    // renderBlockingStatus: toFaroPerformanceTimingString(resourceEntryRaw.renderBlockingStatus),
    // protocol: resourceEntryRaw.nextHopProtocol,
    // initiatorType: resourceEntryRaw.initiatorType,
    // serverTiming: resourceEntryRaw.serverTiming,
  };
}

function toFaroPerformanceTimingString(v: unknown): string {
  if (v == null) {
    return 'unknown';
  }

  if (typeof v === 'number') {
    if (v < 0) {
      return '';
    }

    return Math.round(v).toString();
  }

  return v.toString();
}
