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
import { BatchSpanProcessor, SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

import { GrafanaAgentTraceExporter } from './otel/agent-exporter';

// the providing of app name here is not great
// should delay initialization and provide the full agent config,
// taking app name from it

export interface TracingInstrumentationOptions {
  resourceAttributes?: ResourceAttributes;
  propagator?: TextMapPropagator;
  contextManager?: ContextManager;
  instrumentations?: InstrumentationOption[];
  spanProcessor?: SpanProcessor;
}

export function getDefaultOTELInstrumentations(ignoreUrls: Array<string | RegExp> = []): InstrumentationOption[] {
  return [
    new DocumentLoadInstrumentation(),
    new FetchInstrumentation({ ignoreUrls }),
    new XMLHttpRequestInstrumentation({ ignoreUrls }),
    new UserInteractionInstrumentation(),
  ];
}

export class TracingInstrumentation extends BaseInstrumentation {
  name = '@grafana/agent-tracing-web';
  version = VERSION;

  static SCHEDULED_BATCH_DELAY_MS = 1000;

  constructor(private options: TracingInstrumentationOptions = {}) {
    super();
  }

  initialize(): void {
    const config = this.agent.config;
    const options = this.options;
    const attributes: ResourceAttributes = {};

    if (config.app.name) {
      attributes[SemanticResourceAttributes.SERVICE_NAME] = config.app.name;
    }
    if (config.app.version) {
      attributes[SemanticResourceAttributes.SERVICE_VERSION] = config.app.version;
    }

    Object.assign(attributes, options.resourceAttributes);

    const resource = Resource.default().merge(new Resource(attributes));

    const provider = new WebTracerProvider({ resource });
    provider.addSpanProcessor(
      options.spanProcessor ??
        new BatchSpanProcessor(new GrafanaAgentTraceExporter({ agent }), {
          scheduledDelayMillis: TracingInstrumentation.SCHEDULED_BATCH_DELAY_MS,
        })
    );
    provider.register({
      propagator: options.propagator ?? new W3CTraceContextPropagator(),
      contextManager: options.contextManager ?? new ZoneContextManager(),
    });

    registerInstrumentations({
      instrumentations: options.instrumentations?.length
        ? options.instrumentations
        : getDefaultOTELInstrumentations(this.getIgnoreUrls()),
    });
    agent.api.initOTEL(trace, context);
  }

  private getIgnoreUrls(): Array<string | RegExp> {
    return this.agent.transports.transports.flatMap((transport) => transport.getIgnoreUrls());
  }
}
