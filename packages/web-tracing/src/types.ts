import type { ContextManager, TextMapPropagator } from '@opentelemetry/api';
import type { InstrumentationOption } from '@opentelemetry/instrumentation';
import type { ResourceAttributes } from '@opentelemetry/resources';
import type { SpanProcessor } from '@opentelemetry/sdk-trace-web';
import type { Patterns } from 'packages/core/src';

import type { API } from '@grafana/faro-web-sdk';

export interface FaroTraceExporterConfig {
  api: API;
}

export interface TracingInstrumentationOptions {
  resourceAttributes?: ResourceAttributes;
  propagator?: TextMapPropagator;
  contextManager?: ContextManager;
  instrumentations?: InstrumentationOption[];
  spanProcessor?: SpanProcessor;
  instrumentationOptions?: {
    propagateTraceHeaderCorsUrls: MatchUrlDefinitions;
  };
}

export type MatchUrlDefinitions = Patterns;
