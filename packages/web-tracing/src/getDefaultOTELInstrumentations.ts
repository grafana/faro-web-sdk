import type { Span } from '@opentelemetry/api';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

import { stringifyExternalJson, unknownString } from '@grafana/faro-core';
import { performanceEntriesSubscription } from '@grafana/faro-web-sdk';

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

const xhrInitiatorType = 'xmlhttprequest';
const fetchInitiatorType = 'fetch';

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
        const url = (result as WithURL).url || (request as WithURL).url || getUrlFromSpan(span);
        mapHttpRequestToPerformanceEntry(span, url, fetchInitiatorType);

        fetchInstrumentationOptions?.applyCustomAttributesOnSpan?.(span, request, result);
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
      const url = xhr.responseURL || getUrlFromSpan(span);
      mapHttpRequestToPerformanceEntry(span, url, xhrInitiatorType);

      xhrInstrumentationOptions?.applyCustomAttributesOnSpan?.(span, xhr);
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
export function mapHttpRequestToPerformanceEntry(span: Span, url: string, requestType: string) {
  performanceEntriesSubscription.first().subscribe((msg) => {
    const { faroNavigationId, faroResourceId, initiatorType, name } = msg.entry;
    const isHttpRequestEntry = [xhrInitiatorType, fetchInitiatorType].includes(initiatorType);

    if (!isHttpRequestEntry || name !== url || requestType !== initiatorType) {
      return;
    }

    span.setAttribute('faro.performance.navigation.id', faroNavigationId);
    span.setAttribute('faro.performance.resource.id', faroResourceId);
  });
}

// Fallback to get the url from the span if not available in the request data.
// This is a workaround until we have a better solution.
// Maybe we should implement our own FetchInstrumentation and XhrInstrumentation where can hook into the request and response data.
function getUrlFromSpan(span: Span) {
  try {
    const parsedSpan = JSON.parse(stringifyExternalJson({ ...span }));
    return parsedSpan.attributes['http.url'];
  } catch (e) {
    return unknownString;
  }
}
