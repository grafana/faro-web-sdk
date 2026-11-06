import { getActiveTracingRegistrations, getTracingRegistry } from './tracingRegistry';
import type { TracingRegistration } from './tracingRegistry';
import { matchesAnyUrl } from './urlMatcher';
import type { NormalizedUrlMatcher } from './urlMatcher';

export type AttributionStrategy = 'api-url' | 'page-route' | 'fallback';

export interface AttributionConflict {
  kind: 'api-url' | 'page-route';
  registrations: TracingRegistration[];
}

export interface NetworkAttribution {
  registration?: TracingRegistration;
  strategy: AttributionStrategy;
  fallback: boolean;
  apiClaimants: TracingRegistration[];
  pageRouteClaimants: TracingRegistration[];
  conflict?: AttributionConflict;
}

function getMatchers(registration: TracingRegistration, key: 'apiUrlMatchers' | 'pageRouteMatchers') {
  const matchers = registration.configuration[key];
  return Array.isArray(matchers) ? (matchers as NormalizedUrlMatcher[]) : [];
}

function getFallback(registrations: TracingRegistration[]): TracingRegistration | undefined {
  return registrations.find((registration) => !registration.isolate) ?? registrations[0];
}

function fallbackAttribution(
  registrations: TracingRegistration[],
  apiClaimants: TracingRegistration[],
  pageRouteClaimants: TracingRegistration[],
  conflict?: AttributionConflict
): NetworkAttribution {
  return {
    registration: getFallback(registrations),
    strategy: 'fallback',
    fallback: true,
    apiClaimants,
    pageRouteClaimants,
    conflict,
  };
}

/**
 * Resolves one network request synchronously using the V1 API-then-page-route decision table.
 * Manual spans should pass no request URL and therefore always receive fallback attribution.
 */
export function warnOnAttributionConflict(attribution: NetworkAttribution, warn: (message: string) => void): void {
  if (!attribution.conflict) {
    return;
  }

  const registry = getTracingRegistry();
  if (!registry) {
    return;
  }

  const registrationIds = attribution.conflict.registrations
    .map((registration) => registration.registrationId)
    .sort((a, b) => a - b);
  const key = `${attribution.conflict.kind}:${registrationIds.join(',')}`;

  if (registry.ownershipWarnings.keys.includes(key)) {
    return;
  }

  registry.ownershipWarnings.keys.push(key);
  const apps = attribution.conflict.registrations
    .map((registration) => registration.appName ?? `registration ${registration.registrationId}`)
    .join(', ');
  const fallback =
    attribution.registration?.appName ?? `registration ${attribution.registration?.registrationId ?? 'none'}`;

  warn(`Network tracing ownership conflict between apps [${apps}]; using fallback app ${fallback}.`);
}

export function resolveNetworkAttribution(
  requestUrl: string | undefined,
  pageUrl: string | undefined,
  registrations: TracingRegistration[] = getActiveTracingRegistrations()
): NetworkAttribution | undefined {
  const active = registrations.filter((registration) => registration.state === 'active');

  if (active.length === 0) {
    return undefined;
  }

  if (!requestUrl) {
    return fallbackAttribution(active, [], []);
  }

  const apiClaimants = active.filter((registration) =>
    matchesAnyUrl(getMatchers(registration, 'apiUrlMatchers'), requestUrl, pageUrl)
  );

  if (apiClaimants.length === 1) {
    return {
      registration: apiClaimants[0],
      strategy: 'api-url',
      fallback: false,
      apiClaimants,
      pageRouteClaimants: [],
    };
  }

  const pageRouteClaimants = pageUrl
    ? active.filter((registration) => matchesAnyUrl(getMatchers(registration, 'pageRouteMatchers'), pageUrl, pageUrl))
    : [];

  if (pageRouteClaimants.length === 1) {
    return {
      registration: pageRouteClaimants[0],
      strategy: 'page-route',
      fallback: false,
      apiClaimants,
      pageRouteClaimants,
    };
  }

  const conflict =
    pageRouteClaimants.length > 1
      ? { kind: 'page-route' as const, registrations: pageRouteClaimants }
      : apiClaimants.length > 1
        ? { kind: 'api-url' as const, registrations: apiClaimants }
        : undefined;

  return fallbackAttribution(active, apiClaimants, pageRouteClaimants, conflict);
}
