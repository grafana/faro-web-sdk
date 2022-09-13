import { agent, BaseInstrumentation, VERSION } from '@grafana/agent-core';
import { context, trace } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource, ResourceAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

import { GrafanaAgentTraceExporter } from './agentExporter';
import { getDefaultOTELInstrumentations } from './getDefaultOTELInstrumentations';
import { GrafanaAgentSessionSpanProcessor } from './sessionSpanProcessor';
import type { TracingInstrumentationOptions } from './types';

// the providing of app name here is not great
// should delay initialization and provide the full agent config,
// taking app name from it

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
        new GrafanaAgentSessionSpanProcessor(
          new BatchSpanProcessor(new GrafanaAgentTraceExporter({ agent }), {
            scheduledDelayMillis: TracingInstrumentation.SCHEDULED_BATCH_DELAY_MS,
          })
        )
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
