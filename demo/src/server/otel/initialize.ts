import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

import { env } from '../utils';

// OTel really wants to stay like this
// I would have liked to wrap this in a function and call it in index.ts

const provider = new NodeTracerProvider({
  resource: defaultResource().merge(
    resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: env.server.packageName,
      [SEMRESATTRS_SERVICE_VERSION]: env.package.version,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: env.mode.name,
    })
  ),
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: `http://${env.faro.host}:${env.faro.portTraces}`,
      })
    ),
  ],
});

provider.register({
  propagator: new W3CTraceContextPropagator(),
});

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new PgInstrumentation(),
    new WinstonInstrumentation(),
  ],
});
