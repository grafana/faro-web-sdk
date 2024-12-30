import * as api from '@opentelemetry/api';
import * as core from '@opentelemetry/core';
import { InstrumentationBase, isWrapped } from '@opentelemetry/instrumentation';
import * as web from '@opentelemetry/sdk-trace-web';
import {
  SEMATTRS_HTTP_HOST,
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_SCHEME,
  SEMATTRS_HTTP_STATUS_CODE,
  SEMATTRS_HTTP_URL,
  SEMATTRS_HTTP_USER_AGENT,
} from '@opentelemetry/semantic-conventions';
import { Axios, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import { AttributeNames } from './constants';
import type { AxiosInstrumentationOptions } from './types';

/**
 * Additional custom attribute names
 */

export const VERSION = '1.12.3';

/**
 * Configuration interface for the AxiosInstrumentation
 */

export class AxiosInstrumentation extends InstrumentationBase<AxiosInstrumentationOptions> {
  readonly component: string = 'axios';

  readonly version: string = VERSION;

  moduleName = this.component;

  constructor(config: AxiosInstrumentationOptions = {}) {
    super('@grafana/instrumentation-axios', VERSION, config);
    this.enable = this.enable.bind(this);
    this.disable = this.disable.bind(this);
  }

  init(): void {
    // no-op
  }

  private _addFinalSpanAttributes(span: api.Span, response: AxiosResponse) {
    const responseUrl = `${response.config.baseURL ?? ''}/${response.config.url}`;
    const parsedUrl = web.parseUrl(responseUrl);

    span.updateName(`${response.config.method?.toUpperCase()}`);
    span.setAttribute(SEMATTRS_HTTP_STATUS_CODE, response.status);
    if (response.statusText != null) {
      span.setAttribute(AttributeNames.HTTP_STATUS_TEXT, response.statusText);
    }
    span.setAttribute(SEMATTRS_HTTP_HOST, parsedUrl.host);
    span.setAttribute(SEMATTRS_HTTP_SCHEME, parsedUrl.protocol.replace(':', ''));
    if (typeof navigator !== 'undefined') {
      span.setAttribute(SEMATTRS_HTTP_USER_AGENT, navigator.userAgent);
    }

    try {
      this._config.applyCustomAttributesOnSpan?.(span as web.Span, response);
    } catch (e) {
      this._diag.error('Error applying custom attributes', e);
    }
  }

  private _addAxiosHeaders(config: AxiosRequestConfig): void {
    const headers: Record<string, unknown> = config.headers || {};
    api.propagation.inject(api.context.active(), headers);
    // @ts-ignore
    config.headers = headers;
  }

  private createSpan(url: string, options: Partial<Request | RequestInit> = {}): api.Span | undefined {
    if (core.isUrlIgnored(url, this.getConfig().ignoreUrls)) {
      this._diag.debug('ignoring span as url matches ignored url');
      return;
    }

    const method = (options.method || 'GET').toUpperCase();
    const spanName = `HTTP ${method}`;

    return this.tracer.startSpan(spanName, {
      kind: api.SpanKind.CLIENT,
      attributes: {
        [AttributeNames.COMPONENT]: this.moduleName,
        [SEMATTRS_HTTP_METHOD]: method,
        [SEMATTRS_HTTP_URL]: url,
      },
    });
  }

  private _endSpan<T = any>(span: api.Span, response?: AxiosResponse<T>, error?: Error) {
    if (response) {
      // It's an AxiosResponse
      this._addFinalSpanAttributes(span, response);

      if (response.status >= 400) {
        span.setStatus({ code: api.SpanStatusCode.ERROR });
      } else {
        span.setStatus({ code: api.SpanStatusCode.OK });
      }
    } else if (error) {
      // It's an error object
      span.setStatus({ code: api.SpanStatusCode.ERROR, message: error.message });
      if (error.name) {
        span.setAttribute(AttributeNames.HTTP_ERROR_NAME, error.name);
      }
    }

    span.end();
  }

  private _patchAxios() {
    const plugin = this;

    // Wrap axios.request
    if (isWrapped(Axios.prototype.request)) {
      plugin._unwrap(Axios.prototype, 'request');
    }

    plugin._wrap(
      Axios.prototype,
      'request',
      (original: <T = any, R = AxiosResponse<T>, D = any>(config: AxiosRequestConfig<D>) => Promise<R>) => {
        return function patchRequest<T = any, R = AxiosResponse<T>, D = any>(
          this: AxiosInstance,
          requestConfig: AxiosRequestConfig<D>
        ): Promise<R> {
          const url = requestConfig.url ?? '';

          // Create a new span if the URL is not ignored
          const span = plugin.createSpan(url, { method: requestConfig.method });
          if (!span) {
            return original.apply(this, [requestConfig]) as Promise<R>;
          }

          return api.context.with(api.trace.setSpan(api.context.active(), span), () => {
            plugin._addAxiosHeaders(requestConfig);

            return (original.apply(this, [requestConfig]) as Promise<R>)
              .then((response: R) => {
                try {
                  plugin._endSpan<T>(span, response as AxiosResponse<T>);
                } catch (e) {
                  plugin._diag.error('Error ending span', e);
                }
                return response;
              })
              .catch((error: any) => {
                try {
                  plugin._endSpan(
                    span,
                    error?.response,
                    error?.response || {
                      message: error?.message || 'Unknown error',
                      name: error?.name || 'Error',
                    }
                  );
                } catch (e) {
                  plugin._diag.error('Error ending span', e);
                }
                throw error;
              });
          });
        };
      }
    );
  }

  override enable(): void {
    // Patch the instance passed in via this._config
    this._patchAxios();
  }

  override disable(): void {
    // Unwrap the instance
    this._unwrap(Axios.prototype, 'request');
  }
}
