import type { Span } from '@opentelemetry/api';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

import { performanceEntriesSubscription } from '@grafana/faro-web-sdk';

import { FaroXhrInstrumentation } from './faroXhrInstrumentation';
import {
  fetchCustomAttributeFunctionWithDefaults,
  type FetchError,
  xhrCustomAttributeFunctionWithDefaults,
} from './instrumentationUtils';
import type { DefaultInstrumentationsOptions, InstrumentationOption } from './types';

export function getDefaultOTELInstrumentations(options: DefaultInstrumentationsOptions = {}): InstrumentationOption[] {
  const { fetchInstrumentationOptions, xhrInstrumentationOptions, ...sharedOptions } = options;

  const fetchOpts = createFetchInstrumentationOptions(fetchInstrumentationOptions, sharedOptions);
  const xhrOpts = createXhrInstrumentationOptions(xhrInstrumentationOptions, sharedOptions);

  return [new FetchInstrumentation(fetchOpts), new FaroXhrInstrumentation(xhrOpts)];
}
function createFetchInstrumentationOptions(
  fetchInstrumentationOptions: DefaultInstrumentationsOptions['fetchInstrumentationOptions'],
  sharedOptions: Record<string, unknown>
) {
  return {
    ...sharedOptions,
    ignoreNetworkEvents: true,
    // keep this here to overwrite the defaults above if provided by the users
    ...fetchInstrumentationOptions,
    // always keep this function
    applyCustomAttributesOnSpan: fetchCustomAttributeFunctionWithDefaults(
      (span: Span, _request: Request | RequestInit, _result: Response | FetchError) => {
        fetchInstrumentationOptions?.applyCustomAttributesOnSpan?.(span, _request, _result);
        mapHttpRequestToPerformanceEntry(span);
      }
    ),
  };
}

function createXhrInstrumentationOptions(
  xhrInstrumentationOptions: DefaultInstrumentationsOptions['xhrInstrumentationOptions'],
  sharedOptions: Record<string, unknown>
) {
  return {
    ...sharedOptions,
    ignoreNetworkEvents: true,
    // keep this here to overwrite the defaults above if provided by the users
    ...xhrInstrumentationOptions,
    // always keep this function
    applyCustomAttributesOnSpan: xhrCustomAttributeFunctionWithDefaults((span: Span, xhr: XMLHttpRequest) => {
      xhrInstrumentationOptions?.applyCustomAttributesOnSpan?.(span, xhr);
      mapHttpRequestToPerformanceEntry(span);
    }),
  };
}

export function mapHttpRequestToPerformanceEntry(span: Span) {
  performanceEntriesSubscription.first().subscribe((msg) => {
    const { faroNavigationId, faroResourceId } = msg.entry ?? {};
    if (faroNavigationId) {
      span.setAttribute('faro.performance.navigation.id', faroNavigationId);
    }
    if (faroResourceId) {
      span.setAttribute('faro.performance.resource.id', faroResourceId);
    }
  });
}
