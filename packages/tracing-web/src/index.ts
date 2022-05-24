import { BaseInstrumentation, VERSION, agent } from '@grafana/agent-core';
import { trace, context, TextMapPropagator, ContextManager } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { InstrumentationOption, registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { Resource, ResourceAttributes } from '@opentelemetry/resources';
import { SimpleSpanProcessor, SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

import { GrafanaAgentTraceExporter } from './agent-exporter';

// the providing of app name here is not great
// should delay initialization and provide the full agent config,
// taking app name from it

export interface TracingInstrumentationOptions {
  appName: string;
  appVersion: string;
  resourceAttributes?: ResourceAttributes;
  propagator?: TextMapPropagator;
  contextManager?: ContextManager;
  instrumentations?: InstrumentationOption[];
  spanProcessor?: SpanProcessor;
}

export function getDefaultInstrumentations(): InstrumentationOption[] {
  return [
    new DocumentLoadInstrumentation() as any,
    new FetchInstrumentation(),
    new XMLHttpRequestInstrumentation(),
    new UserInteractionInstrumentation(),
  ];
}

export class TracingInstrumentation extends BaseInstrumentation {
  name = '@grafana/agent-tracing-web';
  version = VERSION;

  constructor(private options: TracingInstrumentationOptions) {
    super();
  }

  initialize(): void {
    const options = this.options;
    const attributes: ResourceAttributes = {
      [SemanticResourceAttributes.SERVICE_NAME]: options.appName,
      [SemanticResourceAttributes.SERVICE_VERSION]: options.appVersion,
      ...options.resourceAttributes,
    };

    const resource = Resource.default().merge(new Resource(attributes));

    const provider = new WebTracerProvider({ resource });
    provider.addSpanProcessor(
      options.spanProcessor ?? new SimpleSpanProcessor(new GrafanaAgentTraceExporter({ agent }))
    );
    provider.register({
      propagator: options.propagator ?? new W3CTraceContextPropagator(),
      contextManager: options.contextManager ?? new ZoneContextManager(),
    });

    registerInstrumentations({
      instrumentations: options.instrumentations?.length ? options.instrumentations : getDefaultInstrumentations(),
    });
    agent.api.setOTELTraceAPI(trace);
    agent.api.setOTELContextAPI(context);
  }
}
