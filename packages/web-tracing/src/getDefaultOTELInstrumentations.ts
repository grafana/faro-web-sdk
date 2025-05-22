import type { Span } from '@opentelemetry/api';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

import { performanceEntriesSubscription } from '@grafana/faro-web-sdk';

import { FaroXhrInstrumentation } from './faroXhrInstrumentation';
import {
  fetchCustomAttributeFunctionWithDefaults,
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
      fetchInstrumentationOptions?.applyCustomAttributesOnSpan
    ),

    requestHook: (span: Span, _request: Request | RequestInit) => {
      performanceEntriesSubscription.first().subscribe((msg) => {
        const { faroNavigationId, faroResourceId } = msg.entry ?? {};
        if (faroNavigationId && faroResourceId) {
          span.setAttribute('faro.performance.navigation.id', faroNavigationId);
          span.setAttribute('faro.performance.resource.id', faroResourceId);
        }
      });
    },
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
    applyCustomAttributesOnSpan: xhrCustomAttributeFunctionWithDefaults(
      xhrInstrumentationOptions?.applyCustomAttributesOnSpan
    ),
  };
}
