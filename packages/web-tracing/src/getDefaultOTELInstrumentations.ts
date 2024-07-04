import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';

import type { DefaultInstrumentationsOptions, InstrumentationOption } from './types';

const initialInstrumentationsOptions = {
  ignoreUrls: [],
  propagateTraceHeaderCorsUrls: [],
};

export function getDefaultOTELInstrumentations(
  options: DefaultInstrumentationsOptions = initialInstrumentationsOptions
): InstrumentationOption[] {
  const { fetchInstrumentationOptions, xhrInstrumentationOptions, ...sharedOptions } = options;

  return [
    new FetchInstrumentation({ ...sharedOptions, ...fetchInstrumentationOptions }),
    new XMLHttpRequestInstrumentation({ ...sharedOptions, ...xhrInstrumentationOptions }),
  ];
}
