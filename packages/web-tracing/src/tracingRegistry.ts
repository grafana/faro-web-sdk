import type { Span, TracerProvider } from '@opentelemetry/api';

import { globalObject } from '@grafana/faro-web-sdk';

export const tracingRegistryKey = '_faroTracingRegistry';
export const tracingRegistryProtocolMajor = 1;
export const tracingRegistryProtocolMinor = 0;
export const defaultTracingDrainTimeoutMs = 30_000;
export const maxTracingDrainTimeoutMs = 300_000;

export type TracingMode = 'legacy' | 'routing';

export type TracingRegistrationState = 'active' | 'draining' | 'expired';

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
  readonly configuration: Readonly<Record<string, unknown>>;
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
            typeof instrumentation.disable === 'function'
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
        !!registration.configuration &&
        typeof registration.configuration === 'object' &&
        (registration.provider === undefined || isTracerProviderLike(registration.provider))
    ) &&
    captureStateValid &&
    Array.isArray(registry.propagateTraceHeaderCorsUrls) &&
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

function refreshPropagationUrls(registry: TracingRegistry): void {
  registry.propagateTraceHeaderCorsUrls.splice(
    0,
    registry.propagateTraceHeaderCorsUrls.length,
    ...registry.registrations
      .filter((registration) => registration.state === 'active')
      .flatMap((registration) => {
        const urls = registration.configuration['propagateTraceHeaderCorsUrls'];
        return Array.isArray(urls) ? (urls as Array<string | RegExp>) : [];
      })
  );
}

function refreshCollectorIgnoreUrls(registry: TracingRegistry): void {
  registry.collectorIgnoreUrls.splice(
    0,
    registry.collectorIgnoreUrls.length,
    ...registry.registrations
      .filter((registration) => registration.state === 'active' || registration.state === 'draining')
      .flatMap((registration) => {
        const urls = registration.configuration['collectorIgnoreUrls'];
        return Array.isArray(urls) ? (urls as Array<string | RegExp>) : [];
      })
  );
}

function noteRegistryConfigurationChange(registry: TracingRegistry): void {
  registry.configurationVersion += 1;
  registry.ownershipWarnings = {
    configurationVersion: registry.configurationVersion,
    keys: [],
  };
}

function freezeRegistrationConfiguration(
  configuration: Readonly<Record<string, unknown>> | undefined
): Readonly<Record<string, unknown>> {
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

  return Object.freeze(copy);
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
  configuration?: Readonly<Record<string, unknown>>;
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
 * Returns the active fallback registration. A non-isolated/global registration has priority over
 * isolated registrations; otherwise registration order provides the deterministic isolated-only
 * fallback. Draining and expired lifecycles are deliberately excluded.
 */
export function getFallbackTracingRegistration(): TracingRegistration | undefined {
  const active = getActiveTracingRegistrations();
  return active.find((registration) => !registration.isolate) ?? active[0];
}

/**
 * Test-only utility to clear the page-lifetime registry between tests.
 */
export function resetTracingRegistryForTests(): void {
  delete getGlobal()[tracingRegistryKey];
}
