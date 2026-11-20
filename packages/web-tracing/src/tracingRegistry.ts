import type { Span, TracerProvider } from '@opentelemetry/api';
import type { FetchCustomAttributeFunction, FetchRequestHookFunction } from '@opentelemetry/instrumentation-fetch';
import type { XHRCustomAttributeFunction } from '@opentelemetry/instrumentation-xml-http-request';

import { globalObject } from '@grafana/faro-web-sdk';
import type { API } from '@grafana/faro-web-sdk';

import type { NormalizedUrlMatcher } from './urlMatcher';

export const tracingRegistryKey = '_faroTracingRegistry';
export const tracingRegistryProtocolMajor = 1;
export const tracingRegistryProtocolMinor = 0;
export const defaultTracingDrainTimeoutMs = 30_000;
export const maxTracingDrainTimeoutMs = 300_000;

export type TracingMode = 'legacy' | 'routing';

export type TracingRegistrationState = 'active' | 'draining' | 'expired';

export type TraceHeaderPropagationUrl = string | RegExp;
export type TraceHeaderPropagationUrls = TraceHeaderPropagationUrl | ReadonlyArray<TraceHeaderPropagationUrl>;

/**
 * Versioned cross-bundle contract for per-app routing configuration. Keep changes to this shape
 * synchronized with tracingRegistryProtocolMajor so independently bundled Faro copies cannot
 * silently interpret different registration semantics.
 */
export interface TracingRegistrationConfiguration {
  apiUrlMatchers?: ReadonlyArray<NormalizedUrlMatcher>;
  pageRouteMatchers?: ReadonlyArray<NormalizedUrlMatcher>;
  drainTimeoutMs?: number;
  collectorIgnoreUrls?: ReadonlyArray<TraceHeaderPropagationUrl>;
  appIgnoreUrls?: ReadonlyArray<TraceHeaderPropagationUrl>;
  propagateTraceHeaderCorsUrls?: ReadonlyArray<TraceHeaderPropagationUrl>;
  fetchPropagateTraceHeaderCorsUrls?: TraceHeaderPropagationUrls;
  xhrPropagateTraceHeaderCorsUrls?: TraceHeaderPropagationUrls;
  fetchRequestHook?: FetchRequestHookFunction;
  fetchApplyCustomAttributesOnSpan?: FetchCustomAttributeFunction;
  xhrApplyCustomAttributesOnSpan?: XHRCustomAttributeFunction;
  getActiveUserAction?: () => ReturnType<API['getActiveUserAction']>;
  fallback?: boolean;
}

export function normalizeTracingDrainTimeoutMs(value: unknown, warn: (message: string) => void): number {
  if (value === undefined) {
    return defaultTracingDrainTimeoutMs;
  }

  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    warn(`Invalid drainTimeoutMs; using the default of ${defaultTracingDrainTimeoutMs} ms.`);
    return defaultTracingDrainTimeoutMs;
  }

  if (value > maxTracingDrainTimeoutMs) {
    warn(`drainTimeoutMs exceeds ${maxTracingDrainTimeoutMs} ms and will be clamped.`);
    return maxTracingDrainTimeoutMs;
  }

  return value;
}

export interface TracingRegistration {
  readonly registrationId: number;
  readonly appName?: string;
  readonly isolate: boolean;
  readonly configuration: Readonly<TracingRegistrationConfiguration>;
  readonly provider?: TracerProvider;
  readonly isPaused?: () => boolean;
  readonly shouldSuppressTraceContext?: () => boolean;
  readonly shouldDropLateWork?: () => boolean;
  readonly allowAuxiliarySpan?: (parentSpan: Span) => void;
  readonly onSpanDropped?: (span: Span) => void;
  readonly warn?: (message: string) => void;
  state: TracingRegistrationState;
}

export interface TracingCaptureInstrumentation {
  enable(): void;
  disable(): void;
  getConfig(): unknown;
}

export interface TracingRegistry {
  kind: 'faro-tracing-registry';
  protocolMajor: typeof tracingRegistryProtocolMajor;
  protocolMinor: number;
  mode: TracingMode;
  nextRegistrationId: number;
  registrations: TracingRegistration[];
  captureProvider?: TracerProvider;
  captureOwnerRegistrationId?: number;
  captureInstrumentations?: TracingCaptureInstrumentation[];
  captureInstrumentationsRegistered?: boolean;
  captureGatesInstalled?: boolean;
  captureNativeFetch?: unknown;
  captureNativeXhrOpen?: unknown;
  propagateTraceHeaderCorsUrls: Array<string | RegExp>;
  routingPropagationUrls?: Array<string | RegExp>;
  configurationVersion: number;
  ownershipWarnings: {
    configurationVersion: number;
    keys: string[];
  };
  collectorIgnoreUrls: Array<string | RegExp>;
}

type GlobalWithTracingRegistry = { [tracingRegistryKey]?: unknown };

export interface TracingModeSelection {
  mode?: TracingMode;
  registry?: TracingRegistry;
  incompatibleRegistryDetails?: {
    kind?: unknown;
    protocolMajor?: unknown;
    protocolMinor?: unknown;
  };
  invalidRequestedMode: boolean;
  conflictingRequestedMode?: TracingMode;
  incompatibleRegistry: boolean;
}

function getGlobal(): GlobalWithTracingRegistry {
  return globalObject as unknown as GlobalWithTracingRegistry;
}

function isTracingMode(value: unknown): value is TracingMode {
  return value === 'legacy' || value === 'routing';
}

function getRegistryVersionDetails(value: unknown): TracingModeSelection['incompatibleRegistryDetails'] {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  return {
    kind: candidate['kind'],
    protocolMajor: candidate['protocolMajor'],
    protocolMinor: candidate['protocolMinor'],
  };
}

function isTracerProviderLike(value: unknown): boolean {
  return !!value && typeof value === 'object' && typeof (value as { getTracer?: unknown }).getTracer === 'function';
}

function isUrlPattern(value: unknown): value is TraceHeaderPropagationUrl {
  return typeof value === 'string' || Object.prototype.toString.call(value) === '[object RegExp]';
}

function isUrlPatternArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isUrlPattern);
}

function isTracingRegistrationConfiguration(value: unknown): value is TracingRegistrationConfiguration {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const configuration = value as Record<string, unknown>;
  const matcherArrays = ['apiUrlMatchers', 'pageRouteMatchers'] as const;
  if (
    matcherArrays.some(
      (key) =>
        configuration[key] !== undefined &&
        (!Array.isArray(configuration[key]) ||
          !(configuration[key] as unknown[]).every(
            (matcher) =>
              !!matcher &&
              typeof matcher === 'object' &&
              isUrlPattern((matcher as { pattern?: unknown }).pattern) &&
              ((matcher as { target?: unknown }).target === 'full-url' ||
                (matcher as { target?: unknown }).target === 'pathname')
          ))
    )
  ) {
    return false;
  }

  const patternArrays = ['collectorIgnoreUrls', 'appIgnoreUrls', 'propagateTraceHeaderCorsUrls'] as const;
  if (patternArrays.some((key) => configuration[key] !== undefined && !isUrlPatternArray(configuration[key]))) {
    return false;
  }

  const nestedPatternKeys = ['fetchPropagateTraceHeaderCorsUrls', 'xhrPropagateTraceHeaderCorsUrls'] as const;
  if (
    nestedPatternKeys.some((key) => {
      const patterns = configuration[key];
      return patterns !== undefined && !isUrlPattern(patterns) && !isUrlPatternArray(patterns);
    })
  ) {
    return false;
  }

  const callbackKeys = [
    'fetchRequestHook',
    'fetchApplyCustomAttributesOnSpan',
    'xhrApplyCustomAttributesOnSpan',
    'getActiveUserAction',
  ] as const;
  return (
    (configuration['fallback'] === undefined || typeof configuration['fallback'] === 'boolean') &&
    callbackKeys.every((key) => configuration[key] === undefined || typeof configuration[key] === 'function')
  );
}

function isTracingRegistry(value: unknown): value is TracingRegistry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const registry = value as Partial<TracingRegistry>;
  const captureStateValid =
    registry.captureProvider === undefined && registry.captureInstrumentations === undefined
      ? registry.captureInstrumentationsRegistered === undefined && registry.captureGatesInstalled === undefined
      : isTracerProviderLike(registry.captureProvider) &&
        Array.isArray(registry.captureInstrumentations) &&
        registry.captureInstrumentations.every(
          (instrumentation) =>
            !!instrumentation &&
            typeof instrumentation === 'object' &&
            typeof instrumentation.enable === 'function' &&
            typeof instrumentation.disable === 'function' &&
            typeof instrumentation.getConfig === 'function'
        ) &&
        typeof registry.captureInstrumentationsRegistered === 'boolean' &&
        typeof registry.captureGatesInstalled === 'boolean';

  return (
    registry.kind === 'faro-tracing-registry' &&
    registry.protocolMajor === tracingRegistryProtocolMajor &&
    typeof registry.protocolMinor === 'number' &&
    Number.isInteger(registry.protocolMinor) &&
    registry.protocolMinor >= 0 &&
    isTracingMode(registry.mode) &&
    typeof registry.nextRegistrationId === 'number' &&
    Number.isInteger(registry.nextRegistrationId) &&
    registry.nextRegistrationId >= 0 &&
    Array.isArray(registry.registrations) &&
    registry.registrations.every(
      (registration) =>
        !!registration &&
        typeof registration === 'object' &&
        typeof registration.registrationId === 'number' &&
        Number.isInteger(registration.registrationId) &&
        registration.registrationId >= 0 &&
        typeof registration.isolate === 'boolean' &&
        (registration.state === 'active' || registration.state === 'draining' || registration.state === 'expired') &&
        isTracingRegistrationConfiguration(registration.configuration) &&
        (registration.provider === undefined || isTracerProviderLike(registration.provider))
    ) &&
    captureStateValid &&
    Array.isArray(registry.propagateTraceHeaderCorsUrls) &&
    (registry.routingPropagationUrls === undefined || Array.isArray(registry.routingPropagationUrls)) &&
    typeof registry.configurationVersion === 'number' &&
    Number.isInteger(registry.configurationVersion) &&
    registry.configurationVersion >= 0 &&
    !!registry.ownershipWarnings &&
    registry.ownershipWarnings.configurationVersion === registry.configurationVersion &&
    Array.isArray(registry.ownershipWarnings.keys) &&
    Array.isArray(registry.collectorIgnoreUrls)
  );
}

function createTracingRegistry(mode: TracingMode): TracingRegistry {
  const registry: TracingRegistry = {
    kind: 'faro-tracing-registry',
    protocolMajor: tracingRegistryProtocolMajor,
    protocolMinor: tracingRegistryProtocolMinor,
    mode,
    nextRegistrationId: 0,
    registrations: [],
    propagateTraceHeaderCorsUrls: [],
    routingPropagationUrls: [],
    configurationVersion: 0,
    ownershipWarnings: { configurationVersion: 0, keys: [] },
    collectorIgnoreUrls: [],
  };

  Object.defineProperty(getGlobal(), tracingRegistryKey, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: registry,
  });

  return registry;
}

function samePropagationUrl(left: string | RegExp, right: string | RegExp): boolean {
  if (typeof left === 'string' || typeof right === 'string') {
    return left === right;
  }

  return left.source === right.source && left.flags === right.flags;
}

function refreshPropagationUrls(registry: TracingRegistry): void {
  const previousRoutingUrls = registry.routingPropagationUrls ?? [];
  const retainedUrls = [...registry.propagateTraceHeaderCorsUrls];

  // Older Faro bundles append directly to _faroTracingOwner.propagateTraceHeaderCorsUrls. In
  // routing mode that is the same live array used by OTel, so retain those additions while
  // replacing only the URLs contributed by this registry's active routing registrations.
  for (const previousUrl of previousRoutingUrls) {
    const index = retainedUrls.findIndex((url) => samePropagationUrl(url, previousUrl));
    if (index >= 0) {
      retainedUrls.splice(index, 1);
    }
  }

  const routingUrls = registry.registrations
    .filter((registration) => registration.state === 'active')
    .flatMap((registration) => {
      const urls = registration.configuration.propagateTraceHeaderCorsUrls;
      return Array.isArray(urls) ? (urls as Array<string | RegExp>) : [];
    });

  registry.propagateTraceHeaderCorsUrls.splice(
    0,
    registry.propagateTraceHeaderCorsUrls.length,
    ...retainedUrls,
    ...routingUrls
  );
  registry.routingPropagationUrls = routingUrls;
}

/**
 * Uses the legacy owner allowlist as the live OTel configuration array. Older Faro bundles append
 * to this array without knowing about the routing registry, so routing refreshes must preserve
 * those entries while updating the active routing registrations' contribution.
 */
export function useTracingOwnerPropagationUrls(urls: Array<string | RegExp>): void {
  const registry = getTracingRegistry();
  if (!registry) {
    return;
  }

  registry.propagateTraceHeaderCorsUrls = urls;
  registry.routingPropagationUrls = [];
  refreshPropagationUrls(registry);
}

function appendCollectorIgnoreUrlsToRegistry(registry: TracingRegistry, urls: Array<string | RegExp>): void {
  // Faro transports may still deliver queued batches or retries after the app's tracing provider
  // finishes draining. Keep every known collector excluded for the lifetime of this page registry.
  for (const url of urls) {
    if (!registry.collectorIgnoreUrls.some((existingUrl) => samePropagationUrl(existingUrl, url))) {
      registry.collectorIgnoreUrls.push(url);
    }
  }
}

function refreshCollectorIgnoreUrls(registry: TracingRegistry): void {
  const discoveredUrls = registry.registrations
    .filter((registration) => registration.state === 'active' || registration.state === 'draining')
    .flatMap((registration) => {
      const urls = registration.configuration.collectorIgnoreUrls;
      return Array.isArray(urls) ? (urls as Array<string | RegExp>) : [];
    });

  appendCollectorIgnoreUrlsToRegistry(registry, discoveredUrls);
}

export function appendCollectorIgnoreUrls(urls: Array<string | RegExp>): void {
  const registry = getTracingRegistry();
  if (registry) {
    appendCollectorIgnoreUrlsToRegistry(registry, urls);
  }
}

function noteRegistryConfigurationChange(registry: TracingRegistry): void {
  registry.configurationVersion += 1;
  registry.ownershipWarnings = {
    configurationVersion: registry.configurationVersion,
    keys: [],
  };
}

function warnOnMultipleFallbackRegistrations(registry: TracingRegistry, registrations: TracingRegistration[]): void {
  const explicitFallbacks = registrations.filter(
    (registration) => registration.state === 'active' && registration.configuration.fallback === true
  );
  if (explicitFallbacks.length < 2) {
    return;
  }

  const ids = explicitFallbacks.map(({ registrationId }) => registrationId);
  const warningKey = `fallback:${ids.join(',')}`;
  if (registry.ownershipWarnings.keys.includes(warningKey)) {
    return;
  }

  registry.ownershipWarnings.keys.push(warningKey);
  const selected = explicitFallbacks[0]!;
  const apps = explicitFallbacks.map(({ appName, registrationId }) => appName ?? `registration ${registrationId}`);
  selected.warn?.(
    `Multiple active Faro tracing registrations set fallback: true (${apps.join(', ')}); using the earliest registered app ${selected.appName ?? `registration ${selected.registrationId}`} as fallback.`
  );
}

function freezeRegistrationConfiguration(
  configuration: TracingRegistrationConfiguration | undefined
): Readonly<TracingRegistrationConfiguration> {
  const copy: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(configuration ?? {})) {
    if (Array.isArray(value)) {
      copy[key] = Object.freeze(
        value.map((entry) =>
          entry && typeof entry === 'object' && Object.prototype.toString.call(entry) !== '[object RegExp]'
            ? Object.freeze({ ...(entry as object) })
            : entry
        )
      );
    } else {
      copy[key] = value;
    }
  }

  return Object.freeze(copy) as Readonly<TracingRegistrationConfiguration>;
}

function normalizeRequestedMode(value: unknown): {
  mode?: TracingMode;
  invalid: boolean;
} {
  if (value === undefined) {
    return { invalid: false };
  }

  if (isTracingMode(value)) {
    return { mode: value, invalid: false };
  }

  return { invalid: true };
}

/**
 * Selects the page-lifetime tracing mode and creates the shared registry on first use.
 *
 * The registry object is deliberately stored on the global object. Independently bundled SDK
 * copies therefore observe the same mode and cannot reset it when their own app unregisters.
 */
export function selectTracingMode(requestedMode: unknown): TracingModeSelection {
  const requested = normalizeRequestedMode(requestedMode);
  const global = getGlobal();

  if (tracingRegistryKey in global) {
    const existing = global[tracingRegistryKey];

    if (!isTracingRegistry(existing)) {
      return {
        invalidRequestedMode: requested.invalid,
        incompatibleRegistry: true,
        incompatibleRegistryDetails: getRegistryVersionDetails(existing),
      };
    }

    return {
      mode: existing.mode,
      registry: existing,
      invalidRequestedMode: requested.invalid,
      conflictingRequestedMode: requested.mode && requested.mode !== existing.mode ? requested.mode : undefined,
      incompatibleRegistry: false,
    };
  }

  const mode = requested.mode ?? 'legacy';
  const registry = createTracingRegistry(mode);

  return {
    mode,
    registry,
    invalidRequestedMode: requested.invalid,
    incompatibleRegistry: false,
  };
}

export function getTracingRegistry(): TracingRegistry | undefined {
  const value = getGlobal()[tracingRegistryKey];
  return isTracingRegistry(value) ? value : undefined;
}

export function registerTracingRegistration(input: {
  appName?: string;
  isolate: boolean;
  configuration?: TracingRegistrationConfiguration;
  provider?: TracerProvider;
  isPaused?: () => boolean;
  shouldSuppressTraceContext?: () => boolean;
  shouldDropLateWork?: () => boolean;
  allowAuxiliarySpan?: (parentSpan: Span) => void;
  onSpanDropped?: (span: Span) => void;
  warn?: (message: string) => void;
}): TracingRegistration | undefined {
  const registry = getTracingRegistry();

  if (!registry) {
    return undefined;
  }

  const registration: TracingRegistration = {
    registrationId: registry.nextRegistrationId++,
    appName: input.appName,
    isolate: input.isolate === true,
    configuration: freezeRegistrationConfiguration(input.configuration),
    provider: input.provider,
    isPaused: input.isPaused,
    shouldSuppressTraceContext: input.shouldSuppressTraceContext,
    shouldDropLateWork: input.shouldDropLateWork,
    allowAuxiliarySpan: input.allowAuxiliarySpan,
    onSpanDropped: input.onSpanDropped,
    warn: input.warn,
    state: 'active',
  };

  registry.registrations.push(registration);
  refreshPropagationUrls(registry);
  refreshCollectorIgnoreUrls(registry);
  noteRegistryConfigurationChange(registry);
  warnOnMultipleFallbackRegistrations(registry, registry.registrations);

  return registration;
}

export function markTracingRegistrationDraining(registrationId: number): TracingRegistration | undefined {
  const registration = getTracingRegistry()?.registrations.find(
    (candidate) => candidate.registrationId === registrationId
  );

  if (registration && registration.state === 'active') {
    registration.state = 'draining';
    const registry = getTracingRegistry()!;
    refreshPropagationUrls(registry);
    noteRegistryConfigurationChange(registry);
  }

  return registration;
}

export function expireTracingRegistration(registrationId: number): TracingRegistration | undefined {
  const registration = getTracingRegistry()?.registrations.find(
    (candidate) => candidate.registrationId === registrationId
  );

  if (registration && registration.state !== 'expired') {
    registration.state = 'expired';
    const registry = getTracingRegistry()!;
    refreshPropagationUrls(registry);
    refreshCollectorIgnoreUrls(registry);
    noteRegistryConfigurationChange(registry);
  }

  return registration;
}

export function removeTracingRegistration(registrationId: number): boolean {
  const registry = getTracingRegistry();
  if (!registry) {
    return false;
  }

  const index = registry.registrations.findIndex((candidate) => candidate.registrationId === registrationId);
  if (index < 0) {
    return false;
  }

  registry.registrations.splice(index, 1);
  refreshPropagationUrls(registry);
  refreshCollectorIgnoreUrls(registry);
  noteRegistryConfigurationChange(registry);
  return true;
}

export function getActiveTracingRegistrations(): TracingRegistration[] {
  return getTracingRegistry()?.registrations.filter((registration) => registration.state === 'active') ?? [];
}

export function getPageCollectorIgnoreUrls(): Array<string | RegExp> {
  return getTracingRegistry()?.collectorIgnoreUrls ?? [];
}

/**
 * Returns the active fallback registration. An explicit fallback takes priority regardless of
 * `isolate`; otherwise the earliest active registration is the deterministic last resort.
 * Draining and expired lifecycles are deliberately excluded.
 */
export function getFallbackTracingRegistration(
  registrations: TracingRegistration[] = getActiveTracingRegistrations()
): TracingRegistration | undefined {
  const active = registrations.filter((registration) => registration.state === 'active');
  const explicitFallbacks = active.filter((registration) => registration.configuration.fallback === true);
  const registry = getTracingRegistry();
  if (registry) {
    warnOnMultipleFallbackRegistrations(registry, active);
  }

  return explicitFallbacks[0] ?? active[0];
}

/**
 * Test-only utility to clear the page-lifetime registry between tests.
 */
export function resetTracingRegistryForTests(): void {
  delete getGlobal()[tracingRegistryKey];
}
