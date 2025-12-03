import type { Span } from '@opentelemetry/api';
import { SpanStatusCode } from '@opentelemetry/api';
import type { FetchCustomAttributeFunction } from '@opentelemetry/instrumentation-fetch';

/**
 * Set span status to ERROR when fetch fails
 *
 * This ensures that failed HTTP requests are marked as errors in traces.
 */
export function setSpanStatusOnFetchError(span: Span, error: Error | string): void {
  const message = typeof error === 'string' ? error : error.message;
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message,
  });
}

/**
 * Custom attribute function for fetch instrumentation with defaults
 *
 * Combines user-provided custom attributes with default handling.
 *
 * @param userFunction - Optional user-provided custom attribute function
 * @returns Combined custom attribute function
 */
export function fetchCustomAttributeFunctionWithDefaults(
  userFunction?: FetchCustomAttributeFunction
): FetchCustomAttributeFunction {
  const fn: any = (span: Span, request: Request | RequestInit, result: Response | any) => {
    // Call user function first if provided
    if (userFunction) {
      userFunction(span, request, result);
    }

    // Add default error handling
    // Check if result is an Error (FetchError extends Error)
    if (result && result instanceof Error) {
      setSpanStatusOnFetchError(span, result);
    }
  };
  return fn;
}
