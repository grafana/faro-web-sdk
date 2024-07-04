import { SpanStatusCode } from '@opentelemetry/api';

import { fetchCustomAttributeFunctionWithDefaults, setSpanStatusOnFetchError } from './instrumentationUtils';
import * as instrumentationUtilsMock from './instrumentationUtils';

describe('faroTraceExporter.utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test.each([500, 599, 400, 499, new Error()])('set span status on fetch error', (result) => {
    const span = { setStatus: jest.fn() } as any;
    const request = {} as Request;
    const response = result instanceof Error ? result : ({ status: result } as Response);

    setSpanStatusOnFetchError(span, request, response);

    expect(span.setStatus).toBeCalledWith({ code: SpanStatusCode.ERROR });
  });

  test.each([200, 300, 399])('does not set span status on fetch success', (result) => {
    const span = { setStatus: jest.fn() } as any;
    const request = {} as Request;
    const response = { status: result } as Response;

    setSpanStatusOnFetchError(span, request, response);

    expect(span.setStatus).not.toBeCalled();
  });

  it('calls setSpanStatusOnFetchError and callback if provided', () => {
    const mock = jest.fn();
    jest.spyOn(instrumentationUtilsMock, 'setSpanStatusOnFetchError').mockImplementationOnce(mock);

    const span = { setStatus: jest.fn() } as any;
    const request = {} as Request;
    const response = { status: 500 } as Response;
    const callback = jest.fn();

    fetchCustomAttributeFunctionWithDefaults(callback)(span, request, response);

    expect(span.setStatus).toBeCalledWith({ code: SpanStatusCode.ERROR });
    expect(callback).toBeCalledWith(span, request, response);
  });
});
