import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

import { getDefaultOTELInstrumentations } from './getDefaultOTELInstrumentations';

describe('getDefaultOTELInstrumentations', () => {
  it('should return an array with FetchInstrumentation', () => {
    const instrumentations = getDefaultOTELInstrumentations();

    expect(instrumentations).toHaveLength(1);
    expect(instrumentations[0]).toBeInstanceOf(FetchInstrumentation);
  });

  it('should configure ignoreUrls', () => {
    const ignoreUrls = [/test-url/];
    const instrumentations = getDefaultOTELInstrumentations({ ignoreUrls });

    expect(instrumentations).toHaveLength(1);
    // FetchInstrumentation should have ignoreUrls configured
    expect((instrumentations[0] as any)._config.ignoreUrls).toEqual(ignoreUrls);
  });

  it('should set ignoreNetworkEvents to true by default', () => {
    const instrumentations = getDefaultOTELInstrumentations();

    expect((instrumentations[0] as any)._config.ignoreNetworkEvents).toBe(true);
  });

  it('should allow overriding ignoreNetworkEvents', () => {
    const instrumentations = getDefaultOTELInstrumentations({
      fetchInstrumentationOptions: {
        ignoreNetworkEvents: false,
      },
    });

    expect((instrumentations[0] as any)._config.ignoreNetworkEvents).toBe(false);
  });

  it('should configure propagateTraceHeaderCorsUrls', () => {
    const propagateUrls = [/api\.example\.com/];
    const instrumentations = getDefaultOTELInstrumentations({
      propagateTraceHeaderCorsUrls: propagateUrls,
    });

    expect((instrumentations[0] as any)._config.propagateTraceHeaderCorsUrls).toEqual(propagateUrls);
  });

  it('should apply custom attribute function', () => {
    const customFn = jest.fn();
    const instrumentations = getDefaultOTELInstrumentations({
      fetchInstrumentationOptions: {
        applyCustomAttributesOnSpan: customFn,
      },
    });

    expect(instrumentations).toHaveLength(1);
    // Custom function should be wrapped by our defaults
    expect((instrumentations[0] as any)._config.applyCustomAttributesOnSpan).toBeDefined();
  });

  it('should have a requestHook defined', () => {
    const instrumentations = getDefaultOTELInstrumentations();

    expect((instrumentations[0] as any)._config.requestHook).toBeDefined();
    expect(typeof (instrumentations[0] as any)._config.requestHook).toBe('function');
  });
});
