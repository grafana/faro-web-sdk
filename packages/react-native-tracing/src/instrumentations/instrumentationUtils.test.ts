import { SpanStatusCode } from '@opentelemetry/api';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';

import { setSpanStatusOnFetchError, fetchCustomAttributeFunctionWithDefaults } from './instrumentationUtils';

describe('instrumentationUtils', () => {
  let provider: BasicTracerProvider;

  beforeEach(() => {
    provider = new BasicTracerProvider();
  });

  describe('setSpanStatusOnFetchError', () => {
    it('should set span status to ERROR with error message', () => {
      const tracer = provider.getTracer('test');
      const span = tracer.startSpan('test-span');
      const setStatusSpy = jest.spyOn(span, 'setStatus');
      const error = new Error('Test error');

      setSpanStatusOnFetchError(span, error);

      expect(setStatusSpy).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Test error',
      });
    });

    it('should set span status to ERROR with string message', () => {
      const tracer = provider.getTracer('test');
      const span = tracer.startSpan('test-span');
      const setStatusSpy = jest.spyOn(span, 'setStatus');

      setSpanStatusOnFetchError(span, 'String error message');

      expect(setStatusSpy).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'String error message',
      });
    });
  });

  describe('fetchCustomAttributeFunctionWithDefaults', () => {
    it('should call user function if provided', () => {
      const userFunction = jest.fn();
      const fn = fetchCustomAttributeFunctionWithDefaults(userFunction);

      const tracer = provider.getTracer('test');
      const span = tracer.startSpan('test-span');
      const request = new Request('https://example.com');
      const response = new Response();

      fn(span, request, response);

      expect(userFunction).toHaveBeenCalledWith(span, request, response);
    });

    it('should set error status when result is an Error', () => {
      const fn = fetchCustomAttributeFunctionWithDefaults();

      const tracer = provider.getTracer('test');
      const span = tracer.startSpan('test-span');
      const setStatusSpy = jest.spyOn(span, 'setStatus');
      const request = new Request('https://example.com');
      const error = new Error('Fetch failed');

      fn(span, request, error as any);

      expect(setStatusSpy).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Fetch failed',
      });
    });

    it('should not set error status for successful Response', () => {
      const fn = fetchCustomAttributeFunctionWithDefaults();

      const tracer = provider.getTracer('test');
      const span = tracer.startSpan('test-span');
      const setStatusSpy = jest.spyOn(span, 'setStatus');
      const request = new Request('https://example.com');
      const response = new Response();

      fn(span, request, response);

      expect(setStatusSpy).not.toHaveBeenCalled();
    });

    it('should work with both user function and default error handling', () => {
      const userFunction = jest.fn();
      const fn = fetchCustomAttributeFunctionWithDefaults(userFunction);

      const tracer = provider.getTracer('test');
      const span = tracer.startSpan('test-span');
      const setStatusSpy = jest.spyOn(span, 'setStatus');
      const request = new Request('https://example.com');
      const error = new Error('Combined test error');

      fn(span, request, error as any);

      expect(userFunction).toHaveBeenCalledWith(span, request, error);
      expect(setStatusSpy).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Combined test error',
      });
    });
  });
});
