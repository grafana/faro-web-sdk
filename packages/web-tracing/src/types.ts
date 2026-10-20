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

  /**
   * Withhold trace context from outgoing requests while the session is not part of the sample.
   *
   * Faro drops every signal for an unsampled session, but the fetch and XHR instrumentations still
   * inject a `traceparent` carrying the unsampled flag `00`. Backend OTel SDKs default to
   * `parentbased_always_on`, which honours that flag and drops the server span, so lowering
   * `sessionTracking.samplingRate` silently removes backend traces too. Omitting the header instead
   * lets the backend take its own sampling decision.
   *
   * The trade-off is that requests from unsampled sessions start a new trace on the backend rather
   * than joining the browser's, so the frontend-to-backend link is lost. That link would have
   * pointed at browser data Faro already discarded.
   *
   * This skips the whole `inject` call, so a custom `propagator` has *all* the headers it writes
   * withheld - `tracestate` and `baggage` included - not only `traceparent`.
   *
   * @default false - expected to become true in the next major version
   */
  omitTraceContextForUnsampledSessions?: boolean;
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
