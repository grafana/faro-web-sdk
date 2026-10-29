import { context, propagation, trace } from '@opentelemetry/api';
import type { Attributes, Span } from '@opentelemetry/api';
import { isUrlIgnored, W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import type { Instrumentation } from '@opentelemetry/instrumentation';
import type { FetchCustomAttributeFunction, FetchRequestHookFunction } from '@opentelemetry/instrumentation-fetch';
import type { XHRCustomAttributeFunction } from '@opentelemetry/instrumentation-xml-http-request';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  SamplingDecision,
  StackContextManager,
  WebTracerProvider,
} from '@opentelemetry/sdk-trace-web';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_USER_AGENT_ORIGINAL,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

import { BaseInstrumentation, captureMetas, isArray, VERSION } from '@grafana/faro-web-sdk';
import type { Transport } from '@grafana/faro-web-sdk';

import { resolveNetworkAttribution, warnOnAttributionConflict } from './attributionResolver';
import { FaroMetaAttributesSpanProcessor } from './faroMetaAttributesSpanProcessor';
import { FaroPausablePropagator } from './faroPausablePropagator';
import { FaroTraceExporter } from './faroTraceExporter';
import { getDefaultOTELInstrumentations } from './getDefaultOTELInstrumentations';
import { RoutingTracerProvider } from './routingTracerProvider';
import { getSamplingDecision, isSessionSampled } from './sampler';
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
import { TracingLifecycle, TracingLifecycleExporter, TracingLifecycleSpanProcessor } from './tracingLifecycle';
import { addPropagateTraceHeaderCorsUrls, claimTracingOwner, getTracingOwner } from './tracingOwner';
import { hasExternalGlobalTracerProvider } from './tracingProvider';
import {
  getActiveTracingRegistrations,
  getTracingRegistry,
  markTracingRegistrationDraining,
  normalizeTracingDrainTimeoutMs,
  registerTracingRegistration,
  removeTracingRegistration,
  selectTracingMode,
} from './tracingRegistry';
import type { TracingRegistry } from './tracingRegistry';
import type { TracingInstrumentationOptions } from './types';
import { normalizeUrlMatchers } from './urlMatcher';

const defaultCollectorPattern = /\/collect(?:\/[\w]*)?$/;

function isDefaultCollectorPattern(value: string | RegExp): boolean {
  return value instanceof RegExp && value.source === defaultCollectorPattern.source;
}

function areIgnorePatternsEqual(left: string | RegExp, right: string | RegExp): boolean {
  if (typeof left === 'string' || typeof right === 'string') {
    return left === right;
  }

  return left.source === right.source && left.flags === right.flags;
}

function normalizeCaptureRequestUrl(input: unknown): string | undefined {
  const candidate = input && typeof input === 'object' && 'url' in input ? (input as { url?: unknown }).url : input;
  if (typeof candidate !== 'string' && !(typeof URL !== 'undefined' && candidate instanceof URL)) {
    return undefined;
  }

  try {
    return new URL(String(candidate), typeof location !== 'undefined' ? location.href : undefined).href;
  } catch {
    return undefined;
  }
}

function installRoutingCaptureGates(
  registry: TracingRegistry,
  shouldBypass: (url: string, instrumentationScopeName: string) => boolean,
  warn?: (message: string) => void
): void {
  if (registry.captureGatesInstalled) {
    return;
  }

  const nativeFetch =
    typeof registry.captureNativeFetch === 'function'
      ? (registry.captureNativeFetch as typeof fetch)
      : globalThis.fetch;
  if (typeof nativeFetch === 'function' && typeof globalThis.fetch === 'function') {
    const routedFetch = globalThis.fetch;
    const gatedFetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
      const url = normalizeCaptureRequestUrl(args[0]);
      if (url && shouldBypass(url, '@opentelemetry/instrumentation-fetch')) {
        return nativeFetch.apply(this, args);
      }
      return routedFetch.apply(this, args);
    } as typeof fetch;
    try {
      Object.defineProperty(globalThis, 'fetch', {
        configurable: true,
        writable: true,
        value: gatedFetch,
      });
    } catch {
      warn?.('Faro tracing could not install its fetch suppression gate because the global fetch is locked.');
    }
  }

  const xhrPrototype = typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest.prototype : undefined;
  if (xhrPrototype) {
    type XhrOpen = (this: XMLHttpRequest, ...args: unknown[]) => void;
    const nativeOpen =
      typeof registry.captureNativeXhrOpen === 'function'
        ? (registry.captureNativeXhrOpen as unknown as XhrOpen)
        : (xhrPrototype.open as unknown as XhrOpen);
    const routedOpen = xhrPrototype.open as unknown as XhrOpen;
    const routedXhrs = new WeakSet<XMLHttpRequest>();
    const gatedOpen = function (this: XMLHttpRequest, ...args: unknown[]) {
      const url = normalizeCaptureRequestUrl(args[1]);
      if (url && shouldBypass(url, '@opentelemetry/instrumentation-xml-http-request')) {
        // Upstream open() clears its private request state before replacing it. If this object
        // already went through the routed wrapper, let the wrapper perform that cleanup while
        // retaining the suppressed decision for the subsequent send().
        if (routedXhrs.has(this)) {
          routedOpen.apply(this, args);
          routedXhrs.delete(this);
        }
        return nativeOpen.apply(this, args);
      }
      routedXhrs.add(this);
      return routedOpen.apply(this, args);
    } as unknown as typeof xhrPrototype.open;
    try {
      Object.defineProperty(xhrPrototype, 'open', {
        configurable: true,
        writable: true,
        value: gatedOpen,
      });
    } catch {
      warn?.('Faro tracing could not install its XHR suppression gate because XMLHttpRequest.open is locked.');
    }
  }

  registry.captureGatesInstalled = true;
}

// the providing of app name here is not great
// should delay initialization and provide the full Faro config,
// taking app name from it

export class TracingInstrumentation extends BaseInstrumentation {
  name = '@grafana/faro-web-tracing';
  version: string = VERSION;

  static SCHEDULED_BATCH_DELAY_MS = 1000;

  protected registrationId?: number;
  private routingProvider?: WebTracerProvider;
  private tracingLifecycle?: TracingLifecycle;
  private routingInstrumentations?: Instrumentation[];

  constructor(private options: TracingInstrumentationOptions = {}) {
    super();
  }

  initialize(): void {
    const options = this.options;

    if (hasExternalGlobalTracerProvider()) {
      this.logWarn(
        'An external global OpenTelemetry tracer provider is already registered. Faro will not register a provider or instrument fetch/XHR.'
      );
      this.api.initOTEL(trace, context);
      return;
    }

    const modeSelection = selectTracingMode(options.mode);

    if (modeSelection.invalidRequestedMode) {
      this.logWarn('Invalid tracing mode; the value will be treated as omitted.');
    }

    if (modeSelection.incompatibleRegistry) {
      const observed = modeSelection.incompatibleRegistryDetails;
      this.logWarn(
        `Faro tracing found an incompatible global routing registry (supported protocol major 1; observed kind ${String(
          observed?.kind ?? 'unknown'
        )}, major ${String(observed?.protocolMajor ?? 'unknown')}, minor ${String(
          observed?.protocolMinor ?? 'unknown'
        )}) and will not register a provider or instrument fetch/XHR.`
      );
      this.api.initOTEL(trace, context);
      return;
    }

    if (modeSelection.conflictingRequestedMode) {
      this.logWarn(
        `Tracing mode "${modeSelection.conflictingRequestedMode}" conflicts with the page mode "${modeSelection.mode}"; the existing page mode will be kept.`
      );
    }

    if (modeSelection.mode === 'legacy' && ('apiUrlMatchers' in options || 'pageRouteMatchers' in options)) {
      this.logWarn('URL matcher fields are only supported in routing mode and will be ignored.');
    }

    if (modeSelection.mode === 'routing') {
      this.initializeRouting(options);
      return;
    }

    this.initializeLegacy(options);
  }

  private initializeRouting(options: TracingInstrumentationOptions): void {
    let registrationId: number | undefined;
    const drainTimeoutMs = normalizeTracingDrainTimeoutMs(options.drainTimeoutMs, (message) => this.logWarn(message));
    const lifecycle = new TracingLifecycle(drainTimeoutMs, () => {
      if (registrationId !== undefined) {
        removeTracingRegistration(registrationId);
      }
      this.updateRoutingCaptureState();
    });
    const provider = this.createProvider(options, lifecycle);
    const matcherBaseUrl = typeof location !== 'undefined' ? location.href : undefined;
    this.routingProvider = provider;
    this.tracingLifecycle = lifecycle;
    const registration = registerTracingRegistration({
      appName: this.config.app.name,
      isolate: this.config.isolate,
      configuration: {
        apiUrlMatchers: normalizeUrlMatchers(
          options.apiUrlMatchers,
          (message) => this.logWarn(message),
          matcherBaseUrl
        ),
        pageRouteMatchers: normalizeUrlMatchers(
          options.pageRouteMatchers,
          (message) => this.logWarn(message),
          matcherBaseUrl
        ),
        drainTimeoutMs,
        collectorIgnoreUrls: this.getCollectorIgnoreUrls(),
        appIgnoreUrls: this.config.ignoreUrls ?? [],
        propagateTraceHeaderCorsUrls: options.instrumentationOptions?.propagateTraceHeaderCorsUrls ?? [],
        fetchRequestHook: options.instrumentationOptions?.fetchInstrumentationOptions?.requestHook,
        fetchApplyCustomAttributesOnSpan:
          options.instrumentationOptions?.fetchInstrumentationOptions?.applyCustomAttributesOnSpan,
        xhrApplyCustomAttributesOnSpan:
          options.instrumentationOptions?.xhrInstrumentationOptions?.applyCustomAttributesOnSpan,
      },
      provider,
      isPaused: () => this.transports.isPaused(),
      shouldSuppressTraceContext: () =>
        this.transports.isPaused() ||
        lifecycle.isExpired ||
        (options.omitTraceContextForUnsampledSessions === true && !isSessionSampled(this.api.getSession())),
      shouldDropLateWork: () => lifecycle.isExpired,
      allowAuxiliarySpan: (parentSpan) => lifecycle.allowAuxiliarySpan(parentSpan),
      onSpanDropped: (span) => lifecycle.endSpan(span),
      warn: (message) => this.logWarn(message),
    });

    if (!registration) {
      this.logWarn('Faro tracing could not join the shared routing registry.');
      this.api.initOTEL(trace, context);
      return;
    }

    this.registrationId = registration.registrationId;
    registrationId = registration.registrationId;

    const registry = getTracingRegistry();
    if (!registry) {
      this.logWarn('Faro tracing lost the shared routing registry during initialization.');
      this.api.initOTEL(trace, context);
      return;
    }

    if (Object.prototype.hasOwnProperty.call(options, 'instrumentations')) {
      this.logWarn(
        'Custom OTel instrumentations are unsupported in routing mode; Faro will use its default fetch/XHR instrumentations.'
      );
    }

    if (!registry.captureProvider) {
      const routingProvider = new RoutingTracerProvider((spanOptions, instrumentationScopeName) => {
        const isAutomaticNetworkSpan =
          instrumentationScopeName === '@opentelemetry/instrumentation-fetch' ||
          instrumentationScopeName === '@opentelemetry/instrumentation-xml-http-request';
        const requestUrl = isAutomaticNetworkSpan ? spanOptions.attributes?.['url.full'] : undefined;
        const pageUrl = typeof location !== 'undefined' ? location.href : undefined;
        const attribution = resolveNetworkAttribution(typeof requestUrl === 'string' ? requestUrl : undefined, pageUrl);

        if (!attribution) {
          return undefined;
        }

        warnOnAttributionConflict(attribution, (message) => {
          const warningRegistration = attribution.conflict?.registrations[0] ?? attribution.registration;
          warningRegistration?.warn?.(message);
        });

        const registration = attribution.registration;
        let suppressionLatched = false;
        const shouldSuppressTraceContext = () => {
          const suppressed = registration?.shouldSuppressTraceContext?.() === true;
          suppressionLatched ||= suppressed;
          return suppressionLatched;
        };

        if (typeof requestUrl !== 'string') {
          return {
            registration,
            shouldSuppress: shouldSuppressTraceContext,
            isSuppressed: () => suppressionLatched || registration?.shouldDropLateWork?.() === true,
          };
        }

        const shouldSuppress = () => {
          const suppressed =
            shouldSuppressTraceContext() ||
            isUrlIgnored(
              requestUrl,
              (registration?.configuration['appIgnoreUrls'] as Array<string | RegExp> | undefined) ?? []
            );
          suppressionLatched ||= suppressed;
          return suppressionLatched;
        };

        return {
          registration,
          strategy: attribution.strategy,
          fallback: attribution.fallback,
          suppressed: shouldSuppress(),
          shouldSuppress,
          isSuppressed: () => suppressionLatched || registration?.shouldDropLateWork?.() === true,
        };
      });

      if (!this.registerRoutingProvider(routingProvider, options)) {
        this.api.initOTEL(trace, context);
        return;
      }

      registry.captureProvider = routingProvider;
      registry.captureOwnerRegistrationId = registration.registrationId;
      registry.captureGatesInstalled = false;
      if (registry.captureNativeFetch === undefined) {
        registry.captureNativeFetch = globalThis.fetch;
      }
      if (registry.captureNativeXhrOpen === undefined && typeof XMLHttpRequest !== 'undefined') {
        registry.captureNativeXhrOpen = XMLHttpRequest.prototype.open;
      }

      const fetchInstrumentationOptions = {
        ...options.instrumentationOptions?.fetchInstrumentationOptions,
        ignoreUrls: registry.collectorIgnoreUrls,
        propagateTraceHeaderCorsUrls: registry.propagateTraceHeaderCorsUrls,
        requestHook: (span: Span, request: Request | RequestInit) => {
          const resolution = routingProvider.getResolution(span);
          if (!resolution?.registration || resolution.suppressed === true || resolution.shouldSuppress?.()) {
            return;
          }

          const callback = resolution.registration.configuration['fetchRequestHook'] as
            FetchRequestHookFunction | undefined;
          callback?.(span, request);
        },
        applyCustomAttributesOnSpan: (
          span: Span,
          request: Request | RequestInit,
          result: Response | { message: string; status?: number }
        ) => {
          const resolution = routingProvider.getResolution(span);
          if (!resolution?.registration || resolution.suppressed === true || resolution.isSuppressed?.()) {
            return;
          }

          const callback = resolution.registration.configuration['fetchApplyCustomAttributesOnSpan'] as
            FetchCustomAttributeFunction | undefined;
          callback?.(span, request, result);
        },
      };
      const xhrInstrumentationOptions = {
        ...options.instrumentationOptions?.xhrInstrumentationOptions,
        ignoreUrls: registry.collectorIgnoreUrls,
        propagateTraceHeaderCorsUrls: registry.propagateTraceHeaderCorsUrls,
        applyCustomAttributesOnSpan: (span: Span, xhr: XMLHttpRequest) => {
          const resolution = routingProvider.getResolution(span);
          if (!resolution?.registration || resolution.suppressed === true || resolution.isSuppressed?.()) {
            return;
          }

          const callback = resolution.registration.configuration['xhrApplyCustomAttributesOnSpan'] as
            XHRCustomAttributeFunction | undefined;
          callback?.(span, xhr);
        },
      };

      this.routingInstrumentations = getDefaultOTELInstrumentations({
        ignoreUrls: registry.collectorIgnoreUrls,
        propagateTraceHeaderCorsUrls: registry.propagateTraceHeaderCorsUrls,
        shouldRunFaroDefaults: (span) => {
          const resolution = routingProvider.getResolution(span);
          return Boolean(
            resolution?.registration && resolution.suppressed !== true && resolution.isSuppressed?.() !== true
          );
        },
        fetchInstrumentationOptions,
        xhrInstrumentationOptions,
      }) as Instrumentation[];
      registry.captureInstrumentations = this.routingInstrumentations;
      const registrationCleanup = registerInstrumentations({
        tracerProvider: routingProvider,
        instrumentations: this.routingInstrumentations,
      });
      registry.captureInstrumentationsRegistered = typeof registrationCleanup === 'function';
    }

    this.updateRoutingCaptureState();
    const registryAfterCapture = getTracingRegistry();
    if (registryAfterCapture?.captureInstrumentationsRegistered && registryAfterCapture.captureProvider) {
      installRoutingCaptureGates(
        registryAfterCapture,
        (url, instrumentationScopeName) => {
          if (isUrlIgnored(url, registryAfterCapture.collectorIgnoreUrls)) {
            return true;
          }
          return (registryAfterCapture.captureProvider as RoutingTracerProvider).shouldBypassNetworkRequest(
            url,
            instrumentationScopeName
          );
        },
        (message) => this.logWarn(message)
      );
    }
    this.api.initOTEL(trace, context);
  }

  private registerRoutingProvider(
    routingProvider: RoutingTracerProvider,
    options: TracingInstrumentationOptions
  ): boolean {
    if (!trace.setGlobalTracerProvider(routingProvider)) {
      this.logWarn(
        'Faro tracing could not register the shared routing provider because another provider was registered first.'
      );
      return false;
    }

    propagation.setGlobalPropagator(
      new FaroPausablePropagator(options.propagator ?? new W3CTraceContextPropagator(), () =>
        routingProvider.shouldSuppressActiveSpan()
      )
    );

    if (options.contextManager !== null) {
      const contextManager = options.contextManager ?? new StackContextManager();
      contextManager.enable();
      context.setGlobalContextManager(contextManager);
    }

    return true;
  }

  private initializeLegacy(options: TracingInstrumentationOptions): void {
    // OpenTelemetry allows only a single global tracer provider and patches global fetch/XHR once
    // per browsing context. When multiple Faro instances run on the same page (micro-frontends),
    // only the first to initialize owns tracing; later instances would otherwise re-register the
    // provider (throwing "duplicate registration" errors) and re-patch fetch/XHR with their own
    // config, leaving spans attributed to the first app but shaped by the last app's config.
    if (!claimTracingOwner(this.config.app.name)) {
      const owner = getTracingOwner();

      // Contribute this instance's cross-origin propagation allowlist so the owning instance keeps
      // injecting trace headers for URLs this instance configured. This preserves the previous
      // behavior where header propagation was the union of every instance's config.
      addPropagateTraceHeaderCorsUrls(this.options.instrumentationOptions?.propagateTraceHeaderCorsUrls);

      this.logWarn(
        `Tracing is already owned by another Faro instance${
          owner?.appName ? ` ("${owner.appName}")` : ''
        }. This instance will not register a tracer provider or instrument fetch/XHR. ` +
          'Only one Faro instance can own tracing per page.'
      );

      // Still expose the global OTEL trace/context so manual tracing keeps working against the
      // shared provider owned by the first instance.
      this.api.initOTEL(trace, context);

      return;
    }

    const provider = this.createProvider(options);
    const omitForUnsampledSessions = options.omitTraceContextForUnsampledSessions === true;

    provider.register({
      // wrapped so that pausing Faro, or running an unsampled session, also stops trace context
      // from being injected into requests
      propagator: new FaroPausablePropagator(
        options.propagator ?? new W3CTraceContextPropagator(),
        () => this.transports.isPaused() || (omitForUnsampledSessions && !isSessionSampled(this.api.getSession()))
      ),
      contextManager: options.contextManager,
    });

    const { fetchInstrumentationOptions, xhrInstrumentationOptions } = options.instrumentationOptions ?? {};

    // Seed the shared allowlist with this (owning) instance's config and register with the shared
    // array. Later instances append to it, and OpenTelemetry reads it live on each request, so the
    // owner honors every instance's cross-origin propagation config.
    const propagateTraceHeaderCorsUrls = addPropagateTraceHeaderCorsUrls(
      this.options.instrumentationOptions?.propagateTraceHeaderCorsUrls
    );

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

  private createProvider(options: TracingInstrumentationOptions, lifecycle?: TracingLifecycle): WebTracerProvider {
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

    const defaultSpanProcessor = new FaroMetaAttributesSpanProcessor(
      new BatchSpanProcessor(
        lifecycle
          ? new TracingLifecycleExporter(new FaroTraceExporter({ api: this.api }), lifecycle)
          : new FaroTraceExporter({ api: this.api }),
        {
          scheduledDelayMillis: TracingInstrumentation.SCHEDULED_BATCH_DELAY_MS,
          maxExportBatchSize: 30,
        }
      ),
      this.metas
    );
    const spanProcessor = options.spanProcessor ?? defaultSpanProcessor;
    const managedSpanProcessor = lifecycle
      ? new TracingLifecycleSpanProcessor(spanProcessor, lifecycle)
      : spanProcessor;

    return new WebTracerProvider({
      resource,
      sampler: {
        shouldSample: () => {
          // Drop speculative spans before OpenTelemetry can queue them for export after activation.
          if (
            this.config.sessionTracking?.enabled &&
            (document as Document & { prerendering?: boolean }).prerendering
          ) {
            return { decision: SamplingDecision.NOT_RECORD };
          }
          // An earlier activation listener can start a span before the session is initialized.
          // Reconcile it before sampling, since nonrecording spans never reach metadata capture.
          return {
            decision: getSamplingDecision(captureMetas(this.metas).session),
          };
        },
      },
      spanProcessors: [managedSpanProcessor],
    });
  }

  destroy(): void {
    if (this.registrationId !== undefined) {
      const registration = markTracingRegistrationDraining(this.registrationId);
      if (registration && this.tracingLifecycle && this.routingProvider) {
        this.tracingLifecycle.beginDrain(this.routingProvider);
      }
    }
  }

  private updateRoutingCaptureState(): void {
    const instrumentations = getTracingRegistry()?.captureInstrumentations ?? this.routingInstrumentations;
    if (!instrumentations) {
      return;
    }

    if (getActiveTracingRegistrations().length === 0) {
      instrumentations.forEach((instrumentation) => instrumentation.disable());
      return;
    }

    instrumentations.forEach((instrumentation) => instrumentation.enable());
  }

  private getIgnoreUrls(): Array<string | RegExp> {
    return this.transports.transports.flatMap((transport: Transport) => transport.getIgnoreUrls());
  }

  private getCollectorIgnoreUrls(): Array<string | RegExp> {
    const appIgnoreUrls = this.config.ignoreUrls ?? [];
    const transportCollectorUrls = this.transports.transports.flatMap((transport: Transport) => {
      const ignoreUrls = transport.getIgnoreUrls();
      return ignoreUrls.length > 0 ? [ignoreUrls[0]] : [];
    });

    return this.getIgnoreUrls().filter(
      (url) =>
        isDefaultCollectorPattern(url) ||
        transportCollectorUrls.some(
          (collectorUrl) => collectorUrl !== undefined && areIgnorePatternsEqual(collectorUrl, url)
        ) ||
        !appIgnoreUrls.some(
          (configuredUrl) => configuredUrl !== undefined && areIgnorePatternsEqual(configuredUrl, url)
        )
    );
  }
}
