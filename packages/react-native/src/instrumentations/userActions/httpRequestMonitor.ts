import { Observable } from '@grafana/faro-core';

export interface HttpRequestMessagePayload {
  requestId: string;
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  status?: number;
}

export type HttpRequestMessage =
  | { type: 'http_request_start'; request: HttpRequestMessagePayload }
  | { type: 'http_request_end'; request: HttpRequestMessagePayload };

// Global observable for HTTP request monitoring
let httpMonitorObservable: Observable<HttpRequestMessage> | null = null;

/**
 * Monitor for HTTP requests happening during user actions
 * Tracks fetch requests to correlate with user actions
 */
export function monitorHttpRequests(): Observable<HttpRequestMessage> {
  if (!httpMonitorObservable) {
    httpMonitorObservable = new Observable<HttpRequestMessage>();

    // Initialize the global monitoring state
    const global = globalThis as any;
    global.__FARO_HTTP_MONITOR__ = {
      notifyStart: (request: HttpRequestMessagePayload) => {
        httpMonitorObservable?.notify({ type: 'http_request_start', request });
      },
      notifyEnd: (request: HttpRequestMessagePayload) => {
        httpMonitorObservable?.notify({ type: 'http_request_end', request });
      },
    };
  }

  return httpMonitorObservable;
}

/**
 * Notify the HTTP monitor that a request has started
 * Should be called from HttpInstrumentation
 */
export function notifyHttpRequestStart(request: HttpRequestMessagePayload): void {
  const global = globalThis as any;
  global.__FARO_HTTP_MONITOR__?.notifyStart?.(request);
}

/**
 * Notify the HTTP monitor that a request has ended
 * Should be called from HttpInstrumentation
 */
export function notifyHttpRequestEnd(request: HttpRequestMessagePayload): void {
  const global = globalThis as any;
  global.__FARO_HTTP_MONITOR__?.notifyEnd?.(request);
}
