import { context, trace } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource, ResourceAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAMESPACE,
  // eslint-disable-next-line import/no-unresolved
} from '@opentelemetry/semantic-conventions/incubating';

import { BaseInstrumentation, Transport, VERSION } from '@grafana/faro-core';

import { FaroTraceExporter } from './faroTraceExporter';
import { getDefaultOTELInstrumentations } from './getDefaultOTELInstrumentations';
import { getSamplingDecision } from './sampler';
import { FaroSessionSpanProcessor } from './sessionSpanProcessor';

export class TracingInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-web-tracing';
  readonly version = VERSION;

  static SCHEDULED_BATCH_DELAY_MS = 1000;

  initialize(): void {
    if (!this.config.webTracingInstrumentation?.enabled) {
      this.logDebug('faro web-tracing instrumentation disabled');
      return;
    }

    const options = this.config.webTracingInstrumentation ?? {};
    const attributes: ResourceAttributes = {};

    if (this.config.app.name) {
      attributes[ATTR_SERVICE_NAME] = this.config.app.name;
    }

    if (this.config.app.namespace) {
      attributes[ATTR_SERVICE_NAMESPACE] = this.config.app.namespace;
    }

    if (this.config.app.version) {
      attributes[ATTR_SERVICE_VERSION] = this.config.app.version;
    }

    if (this.config.app.environment) {
      attributes[ATTR_DEPLOYMENT_ENVIRONMENT_NAME] = this.config.app.environment;
      /**
       * @deprecated will be removed in the future and has been replaced by ATTR_DEPLOYMENT_ENVIRONMENT_NAME (deployment.environment.name)
       */
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
      spanProcessors: [
        options.spanProcessor ??
          new FaroSessionSpanProcessor(
            new BatchSpanProcessor(new FaroTraceExporter({ api: this.api }), {
              scheduledDelayMillis: TracingInstrumentation.SCHEDULED_BATCH_DELAY_MS,
              maxExportBatchSize: 30,
            }),
            this.metas
          ),
      ],
    });

    provider.register({
      propagator: options.propagator ?? new W3CTraceContextPropagator(),
      contextManager: options.contextManager,
    });

    const { propagateTraceHeaderCorsUrls, fetchInstrumentationOptions, xhrInstrumentationOptions } =
      options.instrumentationOptions ?? {};

    registerInstrumentations({
      instrumentations:
        options.instrumentations ??
        getDefaultOTELInstrumentations({
          ignoreUrls: this.getIgnoreUrls(),
          propagateTraceHeaderCorsUrls,
          fetchInstrumentationOptions,
          xhrInstrumentationOptions,
        }),
    });

    this.api.initOTEL(trace, context);
  }

  private getIgnoreUrls(): Array<string | RegExp> {
    return this.transports.transports.flatMap((transport: Transport) => transport.getIgnoreUrls());
  }
}
