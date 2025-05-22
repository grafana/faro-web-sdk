import type { Span } from '@opentelemetry/api';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

import { isEmpty, performanceEntriesSubscription } from '@grafana/faro-web-sdk';

import { FaroXhrInstrumentation } from './faroXhrInstrumentation';
import {
  fetchCustomAttributeFunctionWithDefaults,
  type FetchError,
  xhrCustomAttributeFunctionWithDefaults,
} from './instrumentationUtils';
import type { DefaultInstrumentationsOptions, InstrumentationOption } from './types';

// Workaround because the environment always maps the node type instead of the browser type
type WithURL = {
  url: string;
};

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
      (span: Span, request: Request | RequestInit, result: Response | FetchError) => {
        fetchInstrumentationOptions?.applyCustomAttributesOnSpan?.(span, request, result);
        mapHttpRequestToPerformanceEntry(span, (result as typeof result & WithURL).url);
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
      mapHttpRequestToPerformanceEntry(span, xhr.responseURL);
    }),
  };
}

/**
 * Map the request to the performance entry
 *
 * @remarks
 * When instantiating your own FetchInstrumentation or XhrInstrumentation, call this function in the applyCustomAttributesOnSpan to ensure that the performance entry is mapped to the span.
 *
 * @param span - The span to map the request to
 */
export function mapHttpRequestToPerformanceEntry(span: Span, url: string) {
  performanceEntriesSubscription.first().subscribe((msg) => {
    const { faroNavigationId, faroResourceId, name } = msg.entry ?? {};
    if (name == null || url == null || name !== url) {
      return;
    }

    if (faroNavigationId) {
      span.setAttribute('faro.performance.navigation.id', faroNavigationId);
    }
    if (faroResourceId) {
      span.setAttribute('faro.performance.resource.id', faroResourceId);
    }
  });
}
