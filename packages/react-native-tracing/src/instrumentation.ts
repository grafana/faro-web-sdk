import { context, trace } from '@opentelemetry/api';
import type { Attributes } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, BasicTracerProvider as ReactNativeTracerProvider } from '@opentelemetry/sdk-trace-base';
import type { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

import { BaseInstrumentation, getInternalFaroFromGlobalObject, VERSION } from '@grafana/faro-core';
import type { Transport } from '@grafana/faro-core';

import { FaroTraceExporter } from './exporters/faroTraceExporter';
import { getDefaultOTELInstrumentations } from './instrumentations/getDefaultOTELInstrumentations';
import { FaroMetaAttributesSpanProcessor } from './processors/faroMetaAttributesSpanProcessor';
import {
  ATTR_APP_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_DEVICE_BRAND,
  ATTR_DEVICE_LOCALE,
  ATTR_DEVICE_MODEL,
  ATTR_DEVICE_OS_VERSION,
  ATTR_DEVICE_PLATFORM,
  ATTR_PROCESS_RUNTIME_NAME,
  ATTR_PROCESS_RUNTIME_VERSION,
  ATTR_SERVICE_NAMESPACE,
  ATTR_TELEMETRY_DISTRO_NAME,
  ATTR_TELEMETRY_DISTRO_VERSION,
} from './semconv';
import type { TracingInstrumentationOptions } from './types';
import { getSamplingDecision } from './utils/sampler';

// Import React Native TracerProvider
// Note: We use the base provider since React Native doesn't have a specific one

/**
 * TracingInstrumentation for React Native
 *
 * Enables distributed tracing with OpenTelemetry for React Native applications.
 *
 * IMPORTANT: Infinite loop prevention
 * - Uses internalLogger for debugging instead of console
 * - Collector URLs are added to ignoreUrls in HTTP instrumentation
 * - BatchSpanProcessor delays span export to avoid blocking
 * - No console logging during trace export
 *
 * Example usage:
 * ```ts
 * import { initializeFaro } from '@grafana/faro-react-native';
 * import { TracingInstrumentation } from '@grafana/faro-react-native-tracing';
 *
 * initializeFaro({
 *   // ... other config
 *   instrumentations: [
 *     new TracingInstrumentation({
 *       propagateTraceHeaderCorsUrls: [/https:\\/\\/my-api\\.com/],
 *     }),
 *   ],
 * });
 * ```
 */
export class TracingInstrumentation extends BaseInstrumentation {
  name = '@grafana/faro-react-native-tracing';
  version = VERSION;

  static SCHEDULED_BATCH_DELAY_MS = 1000;

  private provider?: BasicTracerProvider;

  constructor(private options: TracingInstrumentationOptions = {}) {
    super();
  }

  initialize(): void {
    const options = this.options;
    const attributes: Attributes = {};

    // App attributes
    if (this.config.app.name) {
      attributes[ATTR_SERVICE_NAME] = this.config.app.name;
    }

    if (this.config.app.namespace) {
      attributes[ATTR_SERVICE_NAMESPACE] = this.config.app.namespace;
    }

    if (this.config.app.version) {
      attributes[ATTR_SERVICE_VERSION] = this.config.app.version;
      attributes[ATTR_APP_VERSION] = this.config.app.version;
    }

    if (this.config.app.environment) {
      attributes[ATTR_DEPLOYMENT_ENVIRONMENT_NAME] = this.config.app.environment;

      /**
       * @deprecated will be removed in the future and has been replaced by ATTR_DEPLOYMENT_ENVIRONMENT_NAME (deployment.environment.name)
       * We need to keep this for compatibility with some internal services for now.
       */
      attributes[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT] = this.config.app.environment;
    }

    // Device/Platform attributes from React Native
    // Note: metas.value contains all meta providers. Device meta is registered under 'browser' key
    const allMetas = this.metas.value as Record<string, any>;
    const deviceMeta = allMetas['browser'];

    if (deviceMeta?.model) {
      attributes[ATTR_DEVICE_MODEL] = deviceMeta.model;
    }

    if (deviceMeta?.brand) {
      attributes[ATTR_DEVICE_BRAND] = deviceMeta.brand;
    }

    if (deviceMeta?.osName) {
      attributes[ATTR_DEVICE_PLATFORM] = deviceMeta.osName;
    }

    if (deviceMeta?.osVersion) {
      attributes[ATTR_DEVICE_OS_VERSION] = deviceMeta.osVersion;
    }

    if (deviceMeta?.locale) {
      attributes[ATTR_DEVICE_LOCALE] = deviceMeta.locale;
    }

    attributes[ATTR_PROCESS_RUNTIME_NAME] = 'react-native';
    attributes[ATTR_PROCESS_RUNTIME_VERSION] = deviceMeta?.osVersion ?? 'unknown';

    attributes[ATTR_TELEMETRY_DISTRO_NAME] = 'faro-react-native-sdk';
    attributes[ATTR_TELEMETRY_DISTRO_VERSION] = VERSION;

    // Merge with user-provided attributes
    Object.assign(attributes, options.resourceAttributes);

    const resource = defaultResource().merge(resourceFromAttributes(attributes));

    // Create tracer provider with span processors
    this.provider = new ReactNativeTracerProvider({
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

    // Register the provider as the global tracer provider
    // This is CRITICAL for the tracer to generate real trace IDs instead of all zeros
    trace.setGlobalTracerProvider(this.provider);

    const { propagateTraceHeaderCorsUrls, fetchInstrumentationOptions } = this.options.instrumentationOptions ?? {};

    // Get ignore URLs from transports to prevent infinite loops
    const ignoreUrls = this.getIgnoreUrls();

    // Register instrumentations
    registerInstrumentations({
      instrumentations:
        options.instrumentations ??
        getDefaultOTELInstrumentations({
          ignoreUrls,
          propagateTraceHeaderCorsUrls,
          fetchInstrumentationOptions,
        }),
    });

    // Expose OTEL API on the global Faro instance for manual span creation
    // This allows users to access trace and context APIs via faro.otel
    const globalFaroInstance = getInternalFaroFromGlobalObject();
    if (globalFaroInstance) {
      (globalFaroInstance as any).otel = {
        trace,
        context,
      };
    }
  }

  /**
   * Get ignore URLs from all transports to avoid tracing collector requests
   * CRITICAL: This prevents infinite loops where trace exports trigger more traces
   */
  private getIgnoreUrls(): Array<string | RegExp> {
    // Get URLs from transports' getIgnoreUrls() method
    const transportUrls = this.transports.transports.flatMap((transport: Transport) => {
      return transport.getIgnoreUrls();
    });

    // Create regex patterns that match both with and without trailing slashes
    // This is critical because fetch() might add trailing slashes
    const regexPatterns = transportUrls.map((url) => {
      if (typeof url === 'string') {
        // Escape special regex characters and make trailing slash optional
        const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^${escapedUrl}/?$`);
      }
      return url;
    });

    // Return both original URLs and regex patterns for maximum coverage
    return [...transportUrls, ...regexPatterns];
  }

  /**
   * Shutdown the tracer provider
   */
  async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.shutdown();
    }
  }
}
