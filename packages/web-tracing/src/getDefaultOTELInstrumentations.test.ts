import { Span } from '@opentelemetry/api';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';

import * as mockWebSdkModule from '@grafana/faro-web-sdk';
import type { ResourceEntryMessage } from '@grafana/faro-web-sdk';

import { getDefaultOTELInstrumentations, mapHttpRequestToPerformanceEntry } from './getDefaultOTELInstrumentations';

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

  describe('Map resource entries to HTTP requests', () => {
    it('adds adds the ID of the performance entry to the span', async () => {
      jest.spyOn(mockWebSdkModule.performanceEntriesSubscription, 'first').mockReturnValue({
        subscribe: (callback: (msg: ResourceEntryMessage) => void) => {
          // @ts-expect-error - mock data, we only need the faroResourceId and faroNavigationId
          callback({ entry: { faroResourceId: 'test-id', faroNavigationId: 'test-navigation-id', name: 'test-url' } });
        },
      } as any);

      const span = {
        attributes: {},
        setAttribute: jest.fn(),
      } as unknown as Span;

      mapHttpRequestToPerformanceEntry(span, 'test-url');

      expect(span.setAttribute).toHaveBeenCalledWith('faro.performance.resource.id', 'test-id');
      expect(span.setAttribute).toHaveBeenCalledWith('faro.performance.navigation.id', 'test-navigation-id');
    });

    it('does not add the ID of the performance entry to the span if the URL does not match or if name or url is not provided', async () => {
      const entryNames = ['test-url', 'test-url', ''];

      jest.spyOn(mockWebSdkModule.performanceEntriesSubscription, 'first').mockReturnValue({
        subscribe: (callback: (msg: ResourceEntryMessage) => void) => {
          callback({
            // @ts-expect-error - mock data, we only need the faroResourceId and faroNavigationId
            entry: {
              faroResourceId: 'test-id',
              faroNavigationId: 'test-navigation-id',
              name: entryNames.shift() ?? '',
            },
          });
        },
      } as any);

      const span = {
        attributes: {},
        setAttribute: jest.fn(),
      } as unknown as Span;

      mapHttpRequestToPerformanceEntry(span, 'test-url-2');
      expect(span.setAttribute).not.toHaveBeenCalled();

      const urlEmpty = '';
      mapHttpRequestToPerformanceEntry(span, urlEmpty);
      expect(span.setAttribute).not.toHaveBeenCalled();

      mapHttpRequestToPerformanceEntry(span, 'test-url-resource-name-empty');
      expect(span.setAttribute).not.toHaveBeenCalled();
    });
  });
});
