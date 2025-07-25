import { context, trace } from '@opentelemetry/api';
import type { Attributes } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_USER_AGENT_ORIGINAL,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

import { BaseInstrumentation, isArray, VERSION } from '@grafana/faro-web-sdk';
import type { Transport } from '@grafana/faro-web-sdk';

import { FaroMetaAttributesSpanProcessor } from './faroMetaAttributesSpanProcessor';
import { FaroTraceExporter } from './faroTraceExporter';
import { getDefaultOTELInstrumentations } from './getDefaultOTELInstrumentations';
import { getSamplingDecision } from './sampler';
import {
  ATTR_BROWSER_BRANDS,
  ATTR_BROWSER_LANGUAGE,
  ATTR_BROWSER_MOBILE,
  ATTR_BROWSER_PLATFORM,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_PROCESS_RUNTIME_NAME,
  ATTR_PROCESS_RUNTIME_VERSION,
  ATTR_SERVICE_NAMESPACE,
  ATTR_TELEMETRY_DISTRO_NAME,
  ATTR_TELEMETRY_DISTRO_VERSION,
} from './semconv';
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
    const attributes: Attributes = {};

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
       * We need to keep this for compatibility with some internal services for now.
       */
      attributes[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT] = this.config.app.environment;
    }

    const browserMeta = this.metas.value.browser;

    if (isArray(browserMeta?.brands)) {
      attributes[ATTR_BROWSER_BRANDS] = browserMeta.brands.map((entry) => entry.brand);
    }

    if (browserMeta?.language) {
      attributes[ATTR_BROWSER_LANGUAGE] = browserMeta.language;
    }

    if (typeof browserMeta?.mobile === 'boolean') {
      attributes[ATTR_BROWSER_MOBILE] = Boolean(browserMeta.mobile);
    }

    if (browserMeta?.os) {
      attributes[ATTR_BROWSER_PLATFORM] = browserMeta.os;
    }

    if (browserMeta?.userAgent) {
      attributes[ATTR_USER_AGENT_ORIGINAL] = browserMeta.userAgent;
    }

    attributes[ATTR_PROCESS_RUNTIME_NAME] = 'browser';
    attributes[ATTR_PROCESS_RUNTIME_VERSION] = this.metas.value.browser?.userAgent;

    attributes[ATTR_TELEMETRY_DISTRO_NAME] = 'faro-web-sdk';
    attributes[ATTR_TELEMETRY_DISTRO_VERSION] = VERSION;

    Object.assign(attributes, options.resourceAttributes);

    const resource = defaultResource().merge(resourceFromAttributes(attributes));

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
          new FaroMetaAttributesSpanProcessor(
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
