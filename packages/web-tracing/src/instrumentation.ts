import { context, trace } from '@opentelemetry/api';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource, ResourceAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_NAMESPACE,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

import { BaseInstrumentation, Transport, VERSION } from '@grafana/faro-web-sdk';

import { FaroTraceExporter } from './faroTraceExporter';
import { getDefaultOTELInstrumentations } from './getDefaultOTELInstrumentations';
import { fetchCustomAttributeFunctionWithDefaults } from './instrumentationUtils';
import { getSamplingDecision } from './sampler';
import { FaroSessionSpanProcessor } from './sessionSpanProcessor';
import type { TracingInstrumentationOptions } from './types';

// the providing of app name here is not great
// should delay initialization and provide the full Faro config,
// taking app name from it

export class TracingInstrumentation extends BaseInstrumentation {
  name = '@grafana/faro-web-tracing';
  version = VERSION;

  static SCHEDULED_BATCH_DELAY_MS = 1000;

  constructor(private options: TracingInstrumentationOptions = {}) {
    super();
  }

  initialize(): void {
    const options = this.options;
    const attributes: ResourceAttributes = {};

    if (this.config.app.name) {
      attributes[SEMRESATTRS_SERVICE_NAME] = this.config.app.name;
    }

    if (this.config.app.namespace) {
      attributes[SEMRESATTRS_SERVICE_NAMESPACE] = this.config.app.namespace;
    }

    if (this.config.app.version) {
      attributes[SEMRESATTRS_SERVICE_VERSION] = this.config.app.version;
    }

    if (this.config.app.environment) {
      attributes[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT] = this.config.app.environment;
    }

    Object.assign(attributes, options.resourceAttributes);

    const resource = Resource.default().merge(new Resource(attributes));

    const provider = new WebTracerProvider({
      resource,
      sampler: {
        shouldSample: () => {
          return {
            decision: getSamplingDecision(this.api.getSession()),
          };
        },
      },
    });

    provider.addSpanProcessor(
      options.spanProcessor ??
        new FaroSessionSpanProcessor(
          new BatchSpanProcessor(new FaroTraceExporter({ api: this.api }), {
            scheduledDelayMillis: TracingInstrumentation.SCHEDULED_BATCH_DELAY_MS,
            maxExportBatchSize: 30,
          }),
          this.metas
        )
    );

    provider.register({
      propagator: options.propagator ?? new W3CTraceContextPropagator(),
      contextManager: options.contextManager ?? new ZoneContextManager(),
    });

    registerInstrumentations({
      instrumentations:
        options.instrumentations ??
        getDefaultOTELInstrumentations({
          ignoreUrls: this.getIgnoreUrls(),
          propagateTraceHeaderCorsUrls: this.options.instrumentationOptions?.propagateTraceHeaderCorsUrls,
          fetchInstrumentationOptions: {
            applyCustomAttributesOnSpan: fetchCustomAttributeFunctionWithDefaults(
              this.options.instrumentationOptions?.fetchInstrumentationOptions?.applyCustomAttributesOnSpan
            ),
          },
          xhrInstrumentationOptions: {
            ...this.options.instrumentationOptions?.xhrInstrumentationOptions,
          },
        }),
    });

    this.api.initOTEL(trace, context);
  }

  private getIgnoreUrls(): Array<string | RegExp> {
    return this.transports.transports.flatMap((transport: Transport) => transport.getIgnoreUrls());
  }
}
