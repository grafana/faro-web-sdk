import { BaseInstrumentation, genShortID, VERSION } from '@grafana/faro-core';

import { notifyHttpRequestEnd, notifyHttpRequestStart } from '../userActions/httpRequestMonitor';

export interface HttpRequestPayload {
  url: string;
  method: string;
  requestId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  error?: string;
}

/**
 * HTTP instrumentation for React Native
 *
 * Tracks fetch API calls to monitor HTTP requests and responses.
 * Automatically captures:
 * - Request URL, method, and timing
 * - Response status codes
 * - Request duration
 * - Network errors
 *
 * @example
 * ```tsx
 * import { initializeFaro } from '@grafana/faro-react-native';
 * import { HttpInstrumentation } from '@grafana/faro-react-native';
 *
 * initializeFaro({
 *   // ...config
 *   instrumentations: [
 *     new HttpInstrumentation({
 *       ignoredUrls: [/localhost/, /127\.0\.0\.1/],
 *     }),
 *   ],
 * });
 * ```
 */
export class HttpInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native:instrumentation-http';
  readonly version = VERSION;

  private originalFetch?: typeof fetch;
  private ignoredUrls: RegExp[];
  private requests: Map<string, HttpRequestPayload> = new Map();

  constructor(options: { ignoredUrls?: RegExp[] } = {}) {
    super();
    this.ignoredUrls = options.ignoredUrls || [];
  }

  initialize(): void {
    this.logInfo('HTTP instrumentation initialized');
    this.patchFetch();
  }

  unpatch(): void {
    if (this.originalFetch) {
      global.fetch = this.originalFetch;
      this.originalFetch = undefined;
    }
    this.requests.clear();
  }

  private isUrlIgnored(url: string): boolean {
    // Ignore the Faro collector URL to avoid tracking our own telemetry
    if (url.includes('grafana.net/collect')) {
      return true;
    }

    // Check user-provided ignored URLs
    if (this.ignoredUrls.some((pattern) => pattern.test(url))) {
      return true;
    }

    // Check config ignore URLs (includes transport URLs)
    const configIgnoreUrls = this.config?.ignoreUrls || [];
    if (configIgnoreUrls.some((pattern) => {
      if (typeof pattern === 'string') {
        return url.includes(pattern);
      }
      return pattern.test(url);
    })) {
      return true;
    }

    return false;
  }

  private patchFetch(): void {
    if (this.originalFetch) {
      return; // Already patched
    }

    this.originalFetch = global.fetch;
    const self = this;

    global.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url || '';
      // Extract method from Request object or init options
      const requestMethod = typeof input !== 'string' && !(input instanceof URL) ? input.method : undefined;
      const method = (init?.method || requestMethod || 'GET').toUpperCase();

      if (self.isUrlIgnored(url)) {
        return self.originalFetch!.call(this, input, init);
      }

      const requestId = genShortID();
      const startTime = Date.now();

      const payload: HttpRequestPayload = {
        url,
        method,
        requestId,
        startTime,
      };

      self.requests.set(requestId, payload);

      // Notify user action monitor
      notifyHttpRequestStart(payload);

      // Track request start
      self.api?.pushMeasurement(
        {
          type: 'http_request_start',
          values: {
            timestamp: startTime,
          },
        },
        {
          context: {
            url,
            method,
            requestId,
          },
        }
      );

      return self
        .originalFetch!.call(this, input, init)
        .then((response) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          payload.endTime = endTime;
          payload.duration = duration;
          payload.status = response.status;

          // Notify user action monitor
          notifyHttpRequestEnd(payload);

          // Track successful request
          self.api?.pushMeasurement(
            {
              type: 'http_request',
              values: {
                duration,
                status: response.status,
              },
            },
            {
              context: {
                url,
                method,
                requestId,
                statusText: response.statusText,
              },
            }
          );

          self.requests.delete(requestId);
          return response;
        })
        .catch((error) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          payload.endTime = endTime;
          payload.duration = duration;
          payload.error = error?.message || 'Unknown error';

          // Notify user action monitor
          notifyHttpRequestEnd(payload);

          // Track failed request
          self.api?.pushMeasurement(
            {
              type: 'http_request_error',
              values: {
                duration,
              },
            },
            {
              context: {
                url,
                method,
                requestId,
                error: payload.error || 'Unknown error',
              },
            }
          );

          self.api?.pushError(error, {
            type: 'HTTP Request Failed',
            context: {
              url,
              method,
              requestId,
              duration: String(duration),
            },
          });

          self.requests.delete(requestId);
          throw error;
        });
    };
  }
}
