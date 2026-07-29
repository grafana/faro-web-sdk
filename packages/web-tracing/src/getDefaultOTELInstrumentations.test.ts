import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';

import { getDefaultOTELInstrumentations } from './getDefaultOTELInstrumentations';

jest.mock('@opentelemetry/instrumentation-fetch');
jest.mock('@opentelemetry/instrumentation-xml-http-request');

describe('getDefaultOTELInstrumentations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return an array of instrumentations', () => {
    const instrumentations = getDefaultOTELInstrumentations();
    expect(instrumentations).toBeInstanceOf(Array);
    expect(instrumentations[0]).toBeInstanceOf(FetchInstrumentation);
    expect(instrumentations[1]).toBeInstanceOf(XMLHttpRequestInstrumentation);
  });

  it('should apply default options', () => {
    getDefaultOTELInstrumentations();

    expect(FetchInstrumentation).toHaveBeenCalledWith({
      ignoreNetworkEvents: true,
      applyCustomAttributesOnSpan: expect.any(Function),
      requestHook: expect.any(Function),
    });

    expect(XMLHttpRequestInstrumentation).toHaveBeenCalledWith({
      ignoreNetworkEvents: true,
      applyCustomAttributesOnSpan: expect.any(Function),
    });
  });

  it('should apply custom options', () => {
    const ignoreUrls = ['example.com'];
    const propagateTraceHeaderCorsUrls = ['example2.com'];

    getDefaultOTELInstrumentations({
      ignoreUrls,
      propagateTraceHeaderCorsUrls,
      fetchInstrumentationOptions: {
        ignoreNetworkEvents: false,
      },
      xhrInstrumentationOptions: {
        ignoreNetworkEvents: false,
      },
    });

    expect(FetchInstrumentation).toHaveBeenCalledWith({
      ignoreUrls,
      propagateTraceHeaderCorsUrls,
      ignoreNetworkEvents: false,
      applyCustomAttributesOnSpan: expect.any(Function),
      requestHook: expect.any(Function),
    });

    expect(XMLHttpRequestInstrumentation).toHaveBeenCalledWith({
      ignoreUrls,
      propagateTraceHeaderCorsUrls,
      ignoreNetworkEvents: false,
      applyCustomAttributesOnSpan: expect.any(Function),
    });
  });

  // The option types used to expose only applyCustomAttributesOnSpan and ignoreNetworkEvents even
  // though every key is spread onto the OTel instrumentation. See issue #1464.
  it('forwards the full set of OTel instrumentation options', () => {
    getDefaultOTELInstrumentations({
      fetchInstrumentationOptions: {
        clearTimingResources: true,
        measureRequestSize: true,
        semconvStabilityOptIn: 'http',
        enabled: false,
      },
      xhrInstrumentationOptions: {
        clearTimingResources: true,
        measureRequestSize: true,
        semconvStabilityOptIn: 'http',
        enabled: false,
      },
    });

    expect(FetchInstrumentation).toHaveBeenCalledWith(
      expect.objectContaining({
        clearTimingResources: true,
        measureRequestSize: true,
        semconvStabilityOptIn: 'http',
        enabled: false,
      })
    );

    expect(XMLHttpRequestInstrumentation).toHaveBeenCalledWith(
      expect.objectContaining({
        clearTimingResources: true,
        measureRequestSize: true,
        semconvStabilityOptIn: 'http',
        enabled: false,
      })
    );
  });

  it('runs a caller supplied fetch requestHook alongside the Faro one', () => {
    const requestHook = jest.fn();

    getDefaultOTELInstrumentations({ fetchInstrumentationOptions: { requestHook } });

    const [fetchOptions] = (FetchInstrumentation as jest.Mock).mock.calls[0] as [{ requestHook: Function }];
    const span = { setAttribute: jest.fn() };
    const request = {} as Request;

    fetchOptions.requestHook(span, request);

    expect(requestHook).toHaveBeenCalledWith(span, request);
  });
});
