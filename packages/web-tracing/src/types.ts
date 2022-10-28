import type { ContextManager, TextMapPropagator } from '@opentelemetry/api';
import type { InstrumentationOption } from '@opentelemetry/instrumentation';
import type { ResourceAttributes } from '@opentelemetry/resources';
import type { SpanProcessor } from '@opentelemetry/sdk-trace-base';

import type { Agent } from '@grafana/faro-core';

export interface GrafanaAgentTraceExporterConfig {
  agent: Agent;
}

export interface TracingInstrumentationOptions {
  resourceAttributes?: ResourceAttributes;
  propagator?: TextMapPropagator;
  contextManager?: ContextManager;
  instrumentations?: InstrumentationOption[];
  spanProcessor?: SpanProcessor;
}
