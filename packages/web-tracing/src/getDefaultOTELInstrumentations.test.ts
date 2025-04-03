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
    });

    expect(XMLHttpRequestInstrumentation).toHaveBeenCalledWith({
      ignoreUrls,
      propagateTraceHeaderCorsUrls,
      ignoreNetworkEvents: false,
      applyCustomAttributesOnSpan: expect.any(Function),
    });
  });
});
