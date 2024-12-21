import type { ContextManager, TextMapPropagator } from '@opentelemetry/api';
import type { Instrumentation } from '@opentelemetry/instrumentation';
import type { FetchCustomAttributeFunction } from '@opentelemetry/instrumentation-fetch';
import type { XHRCustomAttributeFunction } from '@opentelemetry/instrumentation-xml-http-request';
import type { ResourceAttributes } from '@opentelemetry/resources';
import type { SpanProcessor } from '@opentelemetry/sdk-trace-web';

import type { Patterns } from '@grafana/faro-core';
import type { API } from '@grafana/react-native-sdk';

// type got remove by with experimental/v0.52.0 and is replaced by the following type:
// See: https://github.com/open-telemetry/opentelemetry-js/releases/tag/experimental%2Fv0.52.0
export type InstrumentationOption = Instrumentation | Instrumentation[];

export interface FaroTraceExporterConfig {
  api: API;
}

export interface TracingInstrumentationOptions {
  resourceAttributes?: ResourceAttributes;
  propagator?: TextMapPropagator;
  contextManager?: ContextManager;
  instrumentations?: InstrumentationOption[];
  spanProcessor?: SpanProcessor;
  instrumentationOptions?: Omit<DefaultInstrumentationsOptions, 'ignoreUrls'>;
}

export type MatchUrlDefinitions = Patterns;

export type DefaultInstrumentationsOptions = {
  ignoreUrls?: MatchUrlDefinitions;
  propagateTraceHeaderCorsUrls?: MatchUrlDefinitions;

  fetchInstrumentationOptions?: {
    applyCustomAttributesOnSpan?: FetchCustomAttributeFunction;
    ignoreNetworkEvents?: boolean;
  };

  xhrInstrumentationOptions?: {
    applyCustomAttributesOnSpan?: XHRCustomAttributeFunction;
    ignoreNetworkEvents?: boolean;
  };
};
