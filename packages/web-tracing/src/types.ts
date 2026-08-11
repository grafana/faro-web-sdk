import type { Attributes, ContextManager, TextMapPropagator } from '@opentelemetry/api';
import type { Instrumentation } from '@opentelemetry/instrumentation';
import type { FetchInstrumentationConfig } from '@opentelemetry/instrumentation-fetch';
import type { XMLHttpRequestInstrumentationConfig } from '@opentelemetry/instrumentation-xml-http-request';
import type { SpanProcessor } from '@opentelemetry/sdk-trace-web';

import type { API, Patterns } from '@grafana/faro-web-sdk';

// type got remove by with experimental/v0.52.0 and is replaced by the following type:
// See: https://github.com/open-telemetry/opentelemetry-js/releases/tag/experimental%2Fv0.52.0
export type InstrumentationOption = Instrumentation | Instrumentation[];

export interface FaroTraceExporterConfig {
  api: API;
}

export interface TracingInstrumentationOptions {
  resourceAttributes?: Attributes;
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

  /**
   * Options forwarded to the underlying OTel fetch instrumentation.
   *
   * Derived from the OTel config so the two cannot drift.
   *
   * `ignoreUrls` is omitted because Faro derives it from the configured transports, which is what
   * stops Faro from tracing its own collector endpoint. Overriding it here would undo that. To
   * ignore further URLs, use the `ignoreUrls` option in the Faro config, which is merged with
   * Faro's own.
   *
   * `enabled` is omitted because it cannot switch the instrumentation off. OTel enables the
   * instrumentation in its constructor when the flag is set. `registerInstrumentations` then
   * enables anything the constructor skipped. Both values therefore end up enabled. To turn fetch
   * or XHR tracing off, pass your own `instrumentations` array instead.
   */
  fetchInstrumentationOptions?: Omit<FetchInstrumentationConfig, 'ignoreUrls' | 'enabled'>;

  /**
   * Options forwarded to the underlying OTel XHR instrumentation. See
   * `fetchInstrumentationOptions` for why `ignoreUrls` and `enabled` are omitted.
   */
  xhrInstrumentationOptions?: Omit<XMLHttpRequestInstrumentationConfig, 'ignoreUrls' | 'enabled'>;
};
