// @ts-nocheck
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

import { WebSocketInstrumentation } from '@grafana/faro-instrumentation-websocket';

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

  return [
    new FetchInstrumentation(fetchOpts),
    new FaroXhrInstrumentation(xhrOpts),
    // TODO(@lucasbento): fix this type
    new WebSocketInstrumentation(),
  ];
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
