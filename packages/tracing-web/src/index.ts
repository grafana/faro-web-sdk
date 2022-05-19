import type { Instrumentation } from '@grafana/agent-core';
import { agent } from '@grafana/agent-core';
import { trace, context } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { Resource, ResourceAttributes } from '@opentelemetry/resources';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

import { GrafanaAgentTraceExporter } from '@grafana/agent-tracing-web/src/agent-exporter';

// the providing of app name here is not great
// should delay initialization and provide the full agent config,
// taking app name from it
const tracingInstrumentation =
  (appName: string): Instrumentation =>
  () => {
    const attributes: ResourceAttributes = {
      [SemanticResourceAttributes.SERVICE_NAME]: appName,
    };

    const resource = Resource.default().merge(new Resource(attributes));

    const provider = new WebTracerProvider({ resource });
    provider.addSpanProcessor(new SimpleSpanProcessor(new GrafanaAgentTraceExporter({ agent })));
    provider.register({
      propagator: new W3CTraceContextPropagator(),
      contextManager: new ZoneContextManager(),
    });

    registerInstrumentations({
      instrumentations: [
        new DocumentLoadInstrumentation() as any,
        new FetchInstrumentation(),
        new XMLHttpRequestInstrumentation(),
        new UserInteractionInstrumentation(),
      ],
    });
    agent.api.setTracer(provider.getTracer('default'));
    agent.api.setGetActiveSpanInternal(() => {
      return trace.getSpan(context.active());
    });
  };

export default tracingInstrumentation;
