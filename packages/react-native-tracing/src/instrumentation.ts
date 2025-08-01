import {context, trace} from '@opentelemetry/api';
import {W3CTraceContextPropagator} from '@opentelemetry/core';
import {registerInstrumentations} from '@opentelemetry/instrumentation';
import {Resource, ResourceAttributes} from '@opentelemetry/resources';
import {BatchSpanProcessor,  WebTracerProvider} from '@opentelemetry/sdk-trace-web';
import {ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION,} from '@opentelemetry/semantic-conventions';


import {BaseInstrumentation, Transport, VERSION} from '@grafana/react-native-sdk';

import {FaroTraceExporter} from './faroTraceExporter';
import {getDefaultOTELInstrumentations} from './getDefaultOTELInstrumentations';
import {getSamplingDecision} from './sampler';
import {FaroSessionSpanProcessor} from './sessionSpanProcessor';
import type {TracingInstrumentationOptions} from './types';

// the providing of app name here is not great
// should delay initialization and provide the full Faro config,
// taking app name from it

export class TracingInstrumentation extends BaseInstrumentation {
  name = '@grafana/faro-react-native-tracing';
  version = VERSION;

  static SCHEDULED_BATCH_DELAY_MS = 1000;

  constructor(private options: TracingInstrumentationOptions = {}) {
    super();
  }

  initialize(): void {
    const options = this.options;
    const attributes: ResourceAttributes = {};

    if (this.config.app.name) {
      attributes[ATTR_SERVICE_NAME] = this.config.app.name;
    }


    if (this.config.app.version) {
      attributes[ATTR_SERVICE_VERSION] = this.config.app.version;
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
      contextManager: options.contextManager,
    });

    const { propagateTraceHeaderCorsUrls, fetchInstrumentationOptions, xhrInstrumentationOptions } =
    this.options.instrumentationOptions ?? {};

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
