import { resolveNetworkAttribution, warnOnAttributionConflict } from './attributionResolver';
import { registerTracingRegistration, resetTracingRegistryForTests, selectTracingMode } from './tracingRegistry';
import type { TracingRegistration } from './tracingRegistry';

function registration(
  registrationId: number,
  appName: string,
  config: Record<string, unknown> = {},
  isolate = true
): TracingRegistration {
  return {
    registrationId,
    appName,
    isolate,
    configuration: config,
    state: 'active',
  };
}

describe('resolveNetworkAttribution', () => {
  afterEach(() => {
    resetTracingRegistryForTests();
  });

  const pageUrl = 'https://app.example.test/orders';
  const requestUrl = 'https://api.example.test/orders';

  it('gives a unique API claimant precedence over any page route', () => {
    const routeOwner = registration(1, 'route-owner', {
      pageRouteMatchers: [{ pattern: '/orders', target: 'pathname' }],
    });
    const apiOwner = registration(2, 'api-owner', {
      apiUrlMatchers: [{ pattern: 'https://api.example.test/orders', target: 'full-url' }],
    });

    const result = resolveNetworkAttribution(requestUrl, pageUrl, [routeOwner, apiOwner]);

    expect(result?.registration).toBe(apiOwner);
    expect(result?.strategy).toBe('api-url');
    expect(result?.fallback).toBe(false);
  });

  it('uses a unique page route across all apps when the API is shared', () => {
    const routeOwner = registration(1, 'route-owner', {
      pageRouteMatchers: [{ pattern: '/orders', target: 'pathname' }],
    });
    const apiA = registration(2, 'api-a', {
      apiUrlMatchers: [{ pattern: 'https://api.example.test/orders', target: 'full-url' }],
    });
    const apiB = registration(3, 'api-b', {
      apiUrlMatchers: [{ pattern: 'https://api.example.test/orders', target: 'full-url' }],
    });

    const result = resolveNetworkAttribution(requestUrl, pageUrl, [routeOwner, apiA, apiB]);

    expect(result?.registration).toBe(routeOwner);
    expect(result?.strategy).toBe('page-route');
    expect(result?.apiClaimants).toEqual([apiA, apiB]);
  });

  it('uses a unique page route when no app claims the API', () => {
    const routeOwner = registration(1, 'route-owner', {
      pageRouteMatchers: [{ pattern: '/orders', target: 'pathname' }],
    });
    const other = registration(2, 'other');

    const result = resolveNetworkAttribution(requestUrl, pageUrl, [routeOwner, other]);

    expect(result?.registration).toBe(routeOwner);
    expect(result?.strategy).toBe('page-route');
  });

  it('uses the current page route for new spans while keeping an earlier resolution fixed', () => {
    const routeA = registration(1, 'route-a', {
      pageRouteMatchers: [{ pattern: '/a', target: 'pathname' }],
    });
    const routeB = registration(2, 'route-b', {
      pageRouteMatchers: [{ pattern: '/b', target: 'pathname' }],
    });
    const registrations = [routeA, routeB];

    const first = resolveNetworkAttribution(requestUrl, 'https://app.example.test/a', registrations);
    const second = resolveNetworkAttribution(requestUrl, 'https://app.example.test/b', registrations);

    expect(first?.registration).toBe(routeA);
    expect(second?.registration).toBe(routeB);
    expect(first?.registration).toBe(routeA);
  });

  it('counts matching patterns per app rather than per pattern', () => {
    const owner = registration(1, 'owner', {
      apiUrlMatchers: [
        { pattern: 'https://api.example.test/orders', target: 'full-url' },
        { pattern: /api\.example\.test\/orders/, target: 'full-url' },
      ],
    });

    const result = resolveNetworkAttribution(requestUrl, pageUrl, [owner]);

    expect(result?.registration).toBe(owner);
    expect(result?.strategy).toBe('api-url');
    expect(result?.apiClaimants).toEqual([owner]);
  });

  it('falls back and reports ambiguous routes without ranking them', () => {
    const first = registration(1, 'first', {
      pageRouteMatchers: [{ pattern: '/orders', target: 'pathname' }],
    });
    const second = registration(2, 'second', {
      pageRouteMatchers: [{ pattern: '/orders', target: 'pathname' }],
    });
    const fallback = registration(3, 'global', {}, false);

    const result = resolveNetworkAttribution(requestUrl, pageUrl, [first, second, fallback]);

    expect(result?.registration).toBe(fallback);
    expect(result?.strategy).toBe('fallback');
    expect(result?.fallback).toBe(true);
    expect(result?.conflict).toMatchObject({ kind: 'page-route', registrations: [first, second] });
  });

  it('uses fallback when neither strategy resolves and keeps manual spans unattributed', () => {
    const isolated = registration(1, 'isolated');
    const global = registration(2, 'global', {}, false);

    expect(resolveNetworkAttribution(requestUrl, pageUrl, [isolated, global])?.registration).toBe(global);
    expect(resolveNetworkAttribution(undefined, pageUrl, [isolated, global])).toMatchObject({
      registration: global,
      strategy: 'fallback',
      fallback: true,
    });
  });

  it('deduplicates conflict warnings and permits them again after a registry change', () => {
    selectTracingMode('routing');
    const first = registerTracingRegistration({
      appName: 'first',
      isolate: true,
      configuration: { pageRouteMatchers: [{ pattern: '/orders', target: 'pathname' }] },
    });
    const second = registerTracingRegistration({
      appName: 'second',
      isolate: true,
      configuration: { pageRouteMatchers: [{ pattern: '/orders', target: 'pathname' }] },
    });
    const warn = jest.fn();
    const attribution = resolveNetworkAttribution(requestUrl, pageUrl, [first!, second!]);

    warnOnAttributionConflict(attribution!, warn);
    warnOnAttributionConflict(attribution!, warn);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).not.toContain(requestUrl);
    expect(warn.mock.calls[0]?.[0]).toContain('first');
    expect(warn.mock.calls[0]?.[0]).toContain('second');

    registerTracingRegistration({ appName: 'unrelated', isolate: true });
    warnOnAttributionConflict(attribution!, warn);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('does not select draining registrations for new requests', () => {
    const draining = registration(1, 'draining', {
      apiUrlMatchers: [{ pattern: 'https://api.example.test/orders', target: 'full-url' }],
    });
    draining.state = 'draining';
    const active = registration(2, 'active', {}, false);

    const result = resolveNetworkAttribution(requestUrl, pageUrl, [draining, active]);

    expect(result?.registration).toBe(active);
    expect(result?.apiClaimants).toEqual([]);
  });
});
