import { Span, SpanStatusCode } from '@opentelemetry/api';
import type { FetchCustomAttributeFunction } from '@opentelemetry/instrumentation-fetch';
import type { XHRCustomAttributeFunction } from '@opentelemetry/instrumentation-xml-http-request';

export interface FetchError {
  status?: number;
  message: string;
}

/**
 * Adds HTTP status code to every span.
 *
 * The fetch instrumentation does not always set the span status to error as defined by the spec.
 * To work around that issue we manually set the span status.
 *
 * Issue: https://github.com/open-telemetry/opentelemetry-js/issues/3564
 * Spec: https://github.com/open-telemetry/opentelemetry-specification/blob/v1.20.0/specification/trace/semantic_conventions/http.md#status
 */
export function setSpanStatusOnFetchError(span: Span, _request: Request | RequestInit, result: Response | FetchError) {
  const httpStatusCode = result instanceof Error ? 0 : result.status;
  setSpanStatus(span, httpStatusCode);
}

export function setSpanStatusOnXMLHttpRequestError(span: Span, xhr: XMLHttpRequest) {
  setSpanStatus(span, xhr.status);
}

function setSpanStatus(span: Span, httpStatusCode?: number) {
  if (httpStatusCode == null) {
    return;
  }

  const isError = httpStatusCode === 0;
  const isClientOrServerError = httpStatusCode >= 400 && httpStatusCode < 600;

  if (isError || isClientOrServerError) {
    span.setStatus({ code: SpanStatusCode.ERROR });
  }
}

export function fetchCustomAttributeFunctionWithDefaults(callback?: FetchCustomAttributeFunction) {
  return (span: Span, request: Request | RequestInit, result: Response | FetchError) => {
    setSpanStatusOnFetchError(span, request, result);
    callback?.(span, request, result);
  };
}

export function xhrCustomAttributeFunctionWithDefaults(callback?: XHRCustomAttributeFunction) {
  return (span: Span, xhr: XMLHttpRequest) => {
    setSpanStatusOnXMLHttpRequestError(span, xhr);
    callback?.(span, xhr);
  };
}
