import type { ContextManager, TextMapPropagator } from '@opentelemetry/api';
import type { Instrumentation } from '@opentelemetry/instrumentation';
import type { FetchCustomAttributeFunction } from '@opentelemetry/instrumentation-fetch';
import type { XHRCustomAttributeFunction } from '@opentelemetry/instrumentation-xml-http-request';
import type { ResourceAttributes } from '@opentelemetry/resources';
import type { SpanProcessor } from '@opentelemetry/sdk-trace-web';

import type { Patterns } from './types';

// TODO this should not be part of faro-core because it is a concern of the web-sdk package.
// We eventually will refactor the package so the Config can be extended with package specific options.
// We also will remove all package specific functionality from the faro-core package.
// For time reasons and conflicting priorities, we will leave it here for now.

// type got remove by with experimental/v0.52.0 and is replaced by the following type:
// See: https://github.com/open-telemetry/opentelemetry-js/releases/tag/experimental%2Fv0.52.0
export type InstrumentationOption = Instrumentation | Instrumentation[];

export interface TracingInstrumentationOptions {
  resourceAttributes?: ResourceAttributes;
  propagator?: TextMapPropagator;
  contextManager?: ContextManager;
  instrumentations?: InstrumentationOption[];
  spanProcessor?: SpanProcessor;
  instrumentationOptions?: Omit<DefaultInstrumentationsOptions, 'ignoreUrls'>;
}

type DefaultInstrumentationsOptions = {
  ignoreUrls?: Patterns;
  propagateTraceHeaderCorsUrls?: Patterns;

  fetchInstrumentationOptions?: {
    applyCustomAttributesOnSpan?: FetchCustomAttributeFunction;
    ignoreNetworkEvents?: boolean;
  };

  xhrInstrumentationOptions?: {
    applyCustomAttributesOnSpan?: XHRCustomAttributeFunction;
    ignoreNetworkEvents?: boolean;
  };
};
