import {
  expireTracingRegistration,
  getActiveTracingRegistrations,
  getFallbackTracingRegistration,
  getPageCollectorIgnoreUrls,
  getTracingRegistry,
  markTracingRegistrationDraining,
  normalizeTracingDrainTimeoutMs,
  registerTracingRegistration,
  removeTracingRegistration,
  resetTracingRegistryForTests,
  selectTracingMode,
  tracingRegistryKey,
} from './tracingRegistry';

describe('page-lifetime tracing mode', () => {
  afterEach(() => {
    resetTracingRegistryForTests();
  });

  it('defaults the first instance to legacy mode', () => {
    const selection = selectTracingMode(undefined);

    expect(selection.mode).toBe('legacy');
    expect(selection.invalidRequestedMode).toBe(false);
    expect(selection.conflictingRequestedMode).toBeUndefined();
    expect(getTracingRegistry()?.mode).toBe('legacy');
  });

  it('inherits an explicitly selected routing mode when omitted later', () => {
    expect(selectTracingMode('routing').mode).toBe('routing');

    const later = selectTracingMode(undefined);

    expect(later.mode).toBe('routing');
    expect(later.conflictingRequestedMode).toBeUndefined();
  });

  it('warns through the selection result instead of changing the page mode on conflict', () => {
    expect(selectTracingMode(undefined).mode).toBe('legacy');

    const later = selectTracingMode('routing');

    expect(later.mode).toBe('legacy');
    expect(later.conflictingRequestedMode).toBe('routing');
    expect(getTracingRegistry()?.mode).toBe('legacy');
  });

  it('keeps the selected mode while the registry is empty', () => {
    const first = selectTracingMode('routing');
    const registry = getTracingRegistry();

    expect(registry).toBeDefined();
    expect(registry?.nextRegistrationId).toBe(0);

    // No registration is added or removed yet; this represents the empty page registry. A later
    // instance must still observe the page mode rather than selecting a new one.
    const later = selectTracingMode('legacy');

    expect(later.mode).toBe(first.mode);
    expect(later.conflictingRequestedMode).toBe('legacy');
    expect(getTracingRegistry()).toBe(registry);
  });

  it('treats an invalid runtime mode as omitted', () => {
    const first = selectTracingMode(42);

    expect(first.mode).toBe('legacy');
    expect(first.invalidRequestedMode).toBe(true);

    const later = selectTracingMode({ mode: 'routing' });

    expect(later.mode).toBe('legacy');
    expect(later.invalidRequestedMode).toBe(true);
    expect(later.conflictingRequestedMode).toBeUndefined();
  });

  it('normalizes bounded drain timeouts', () => {
    const warn = jest.fn();

    expect(normalizeTracingDrainTimeoutMs(undefined, warn)).toBe(30_000);
    expect(normalizeTracingDrainTimeoutMs(0, warn)).toBe(0);
    expect(normalizeTracingDrainTimeoutMs(300_000, warn)).toBe(300_000);
    expect(normalizeTracingDrainTimeoutMs(300_001, warn)).toBe(300_000);
    expect(normalizeTracingDrainTimeoutMs(-1, warn)).toBe(30_000);
    expect(normalizeTracingDrainTimeoutMs(1.5, warn)).toBe(30_000);
    expect(normalizeTracingDrainTimeoutMs(Number.NaN, warn)).toBe(30_000);
    expect(normalizeTracingDrainTimeoutMs('30', warn)).toBe(30_000);
    expect(warn).toHaveBeenCalledTimes(5);
  });

  it('assigns opaque IDs and keeps same-name lifecycles distinct across registrations', () => {
    selectTracingMode('routing');

    const matchers = [{ pattern: '/orders', target: 'pathname' }];
    const first = registerTracingRegistration({
      appName: 'shared-app',
      isolate: true,
      configuration: { pageRouteMatchers: matchers },
    });
    const second = registerTracingRegistration({ appName: 'shared-app', isolate: false });

    expect(first?.registrationId).toBe(0);
    expect(second?.registrationId).toBe(1);
    expect(first).not.toBe(second);
    matchers.push({ pattern: '/users', target: 'pathname' });
    expect(first?.configuration['pageRouteMatchers']).toHaveLength(1);
    expect(() => {
      (first!.configuration['pageRouteMatchers'] as Array<{ pattern: string }>)[0]!.pattern = '/changed';
    }).toThrow();
    expect(getActiveTracingRegistrations()).toEqual([first, second]);

    markTracingRegistrationDraining(first!.registrationId);
    expect(first?.state).toBe('draining');
    expect(getActiveTracingRegistrations()).toEqual([second]);

    removeTracingRegistration(first!.registrationId);
    const replacement = registerTracingRegistration({ appName: 'shared-app', isolate: true });

    expect(replacement?.registrationId).toBe(2);
    expect(getTracingRegistry()?.registrations).toEqual([second, replacement]);
  });

  it('uses only active registrations for the propagation union', () => {
    selectTracingMode('routing');
    const first = registerTracingRegistration({
      appName: 'first',
      isolate: true,
      configuration: { propagateTraceHeaderCorsUrls: ['https://first.example.test'] },
    });
    const second = registerTracingRegistration({
      appName: 'second',
      isolate: true,
      configuration: { propagateTraceHeaderCorsUrls: [/second\\.example\\.test/] },
    });

    expect(getTracingRegistry()?.propagateTraceHeaderCorsUrls).toEqual([
      'https://first.example.test',
      /second\\.example\\.test/,
    ]);

    markTracingRegistrationDraining(first!.registrationId);
    expect(getTracingRegistry()?.propagateTraceHeaderCorsUrls).toEqual([/second\\.example\\.test/]);
    expect(second?.state).toBe('active');
  });

  it('keeps active and draining collector exclusions page-wide until expiry', () => {
    selectTracingMode('routing');
    const first = registerTracingRegistration({
      appName: 'first',
      isolate: true,
      configuration: { collectorIgnoreUrls: ['https://collector.first.test'] },
    });
    const second = registerTracingRegistration({
      appName: 'second',
      isolate: true,
      configuration: { collectorIgnoreUrls: [/collector\\.second\\.test/] },
    });

    expect(getPageCollectorIgnoreUrls()).toEqual(['https://collector.first.test', /collector\\.second\\.test/]);

    markTracingRegistrationDraining(first!.registrationId);
    expect(getPageCollectorIgnoreUrls()).toHaveLength(2);

    expireTracingRegistration(first!.registrationId);
    expect(getPageCollectorIgnoreUrls()).toEqual([/collector\\.second\\.test/]);
    expect(second?.state).toBe('active');
  });

  it('prefers the active global fallback and transitions to the earliest remaining app', () => {
    selectTracingMode('routing');

    const isolatedFirst = registerTracingRegistration({ appName: 'isolated-a', isolate: true });
    const isolatedSecond = registerTracingRegistration({ appName: 'isolated-b', isolate: true });

    expect(getFallbackTracingRegistration()).toBe(isolatedFirst);

    const global = registerTracingRegistration({ appName: 'global', isolate: false });
    expect(getFallbackTracingRegistration()).toBe(global);

    markTracingRegistrationDraining(global!.registrationId);
    expect(getFallbackTracingRegistration()).toBe(isolatedFirst);

    markTracingRegistrationDraining(isolatedFirst!.registrationId);
    expect(getFallbackTracingRegistration()).toBe(isolatedSecond);
  });

  it('does not replace an incompatible registry', () => {
    Object.defineProperty(globalThis, tracingRegistryKey, {
      configurable: true,
      enumerable: false,
      writable: false,
      value: { kind: 'other-registry', protocolMajor: 2 },
    });

    const selection = selectTracingMode('routing');

    expect(selection.incompatibleRegistry).toBe(true);
    expect(selection.incompatibleRegistryDetails).toEqual({
      kind: 'other-registry',
      protocolMajor: 2,
      protocolMinor: undefined,
    });
    expect(selection.mode).toBeUndefined();
    expect((globalThis as Record<string, unknown>)[tracingRegistryKey]).toEqual({
      kind: 'other-registry',
      protocolMajor: 2,
    });
  });

  it('yields from a malformed same-major capture registry', () => {
    const selection = selectTracingMode('routing');
    const registry = selection.registry! as unknown as Record<string, unknown>;
    registry['captureProvider'] = {};
    registry['captureInstrumentations'] = {};
    registry['captureInstrumentationsRegistered'] = true;
    registry['captureGatesInstalled'] = true;

    const nextSelection = selectTracingMode('routing');

    expect(nextSelection.incompatibleRegistry).toBe(true);
    expect(nextSelection.incompatibleRegistryDetails?.protocolMajor).toBe(1);
  });
});
