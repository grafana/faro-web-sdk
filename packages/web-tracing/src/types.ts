import type { ContextManager, TextMapPropagator } from '@opentelemetry/api';
import type { InstrumentationOption } from '@opentelemetry/instrumentation';
import type { ResourceAttributes } from '@opentelemetry/resources';
import type { SpanProcessor } from '@opentelemetry/sdk-trace-base';

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
}
