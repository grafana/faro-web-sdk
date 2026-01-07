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

/**
 * Monitor for HTTP requests happening during user actions
 * Tracks fetch requests to correlate with user actions
 */
export function monitorHttpRequests(): Observable<HttpRequestMessage> {
  return new Observable<HttpRequestMessage>((subscriber) => {
    // Access the global fetch monitoring state
    // This assumes HttpInstrumentation has already patched fetch
    const global = globalThis as any;

    if (!global.__FARO_HTTP_MONITOR__) {
      // Initialize the monitoring array if it doesn't exist
      global.__FARO_HTTP_MONITOR__ = {
        subscribers: [],
        notifyStart: (request: HttpRequestMessagePayload) => {
          global.__FARO_HTTP_MONITOR__.subscribers.forEach((sub: any) => {
            try {
              sub.next({ type: 'http_request_start', request });
            } catch (_err) {
              // Ignore subscriber errors
            }
          });
        },
        notifyEnd: (request: HttpRequestMessagePayload) => {
          global.__FARO_HTTP_MONITOR__.subscribers.forEach((sub: any) => {
            try {
              sub.next({ type: 'http_request_end', request });
            } catch (_err) {
              // Ignore subscriber errors
            }
          });
        },
      };
    }

    // Add this subscriber to the list
    global.__FARO_HTTP_MONITOR__.subscribers.push(subscriber);

    // Return cleanup function
    return () => {
      const index = global.__FARO_HTTP_MONITOR__.subscribers.indexOf(subscriber);
      if (index > -1) {
        global.__FARO_HTTP_MONITOR__.subscribers.splice(index, 1);
      }
    };
  });
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
