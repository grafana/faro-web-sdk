import { trace } from '@opentelemetry/api';

import { getTracingOwner } from './tracingOwner';
import { getTracingRegistry } from './tracingRegistry';

type ProviderLike = {
  getTracer?: (...args: unknown[]) => unknown;
  getDelegateTracer?: (...args: unknown[]) => unknown;
  getDelegate?: () => unknown;
};

function hasExternalDelegate(provider: ProviderLike): boolean {
  if (typeof provider.getDelegateTracer === 'function') {
    return provider.getDelegateTracer('@grafana/faro-web-tracing') !== undefined;
  }

  if (typeof provider.getDelegate === 'function') {
    const delegate = provider.getDelegate();
    return delegate !== undefined && delegate?.constructor?.name !== 'NoopTracerProvider';
  }

  return true;
}

/**
 * Detects a provider that was registered before Faro. OpenTelemetry exposes a proxy provider from
 * the global API, so use its public delegate probe rather than relying on an instanceof check that
 * would fail when another bundle ships its own copy of @opentelemetry/api.
 */
export function hasExternalGlobalTracerProvider(): boolean {
  if (getTracingOwner() || getTracingRegistry()?.captureProvider) {
    return false;
  }

  const provider = trace.getTracerProvider() as unknown as ProviderLike;
  return hasExternalDelegate(provider);
}
