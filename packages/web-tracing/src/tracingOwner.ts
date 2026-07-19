import { globalObject } from '@grafana/faro-web-sdk';

/**
 * OpenTelemetry allows only a single global tracer provider, propagator and context manager per
 * browsing context, and the fetch/XHR instrumentations patch the global `fetch`/`XMLHttpRequest`
 * only once. When multiple Faro instances run on the same page (micro-frontends), they must
 * therefore agree on a single instance that owns tracing.
 *
 * The owner is tracked on the global object rather than in module scope because independently
 * bundled micro-frontends each ship their own copy of this package, so a module-level singleton
 * would not be shared between them. They do share a single `window`.
 */
export const tracingOwnerKey = '_faroTracingOwner';

export interface TracingOwner {
  appName?: string;
}

type GlobalWithTracingOwner = { [tracingOwnerKey]?: TracingOwner };

function getGlobal(): GlobalWithTracingOwner {
  return globalObject as unknown as GlobalWithTracingOwner;
}

/**
 * Attempts to claim ownership of tracing for the current browsing context. Returns `true` if the
 * caller became the owner (no other instance had claimed it yet), or `false` if tracing is already
 * owned by another instance.
 */
export function claimTracingOwner(appName?: string): boolean {
  if (isTracingOwned()) {
    return false;
  }

  Object.defineProperty(getGlobal(), tracingOwnerKey, {
    // configurable so tests can reset the claim; writable:false still prevents accidental reassignment
    configurable: true,
    enumerable: false,
    writable: false,
    value: { appName },
  });

  return true;
}

export function getTracingOwner(): TracingOwner | undefined {
  return getGlobal()[tracingOwnerKey];
}

export function isTracingOwned(): boolean {
  return tracingOwnerKey in getGlobal();
}

/**
 * Test-only utility to clear the claimed owner between tests.
 */
export function resetTracingOwnerForTests(): void {
  delete getGlobal()[tracingOwnerKey];
}
