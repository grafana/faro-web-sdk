import {
  addPropagateTraceHeaderCorsUrls,
  claimTracingOwner,
  getTracingOwner,
  isTracingOwned,
  resetTracingOwnerForTests,
} from './tracingOwner';

describe('tracingOwner', () => {
  afterEach(() => {
    resetTracingOwnerForTests();
  });

  it('is unowned initially', () => {
    expect(isTracingOwned()).toBe(false);
    expect(getTracingOwner()).toBeUndefined();
  });

  it('lets the first caller claim ownership', () => {
    expect(claimTracingOwner('app-a')).toBe(true);
    expect(isTracingOwned()).toBe(true);
    expect(getTracingOwner()).toEqual({ appName: 'app-a', propagateTraceHeaderCorsUrls: [] });
  });

  it('rejects subsequent claims and keeps the first owner', () => {
    expect(claimTracingOwner('app-a')).toBe(true);
    expect(claimTracingOwner('app-b')).toBe(false);
    expect(getTracingOwner()?.appName).toBe('app-a');
  });

  it('can claim without an app name', () => {
    expect(claimTracingOwner()).toBe(true);
    expect(getTracingOwner()?.appName).toBeUndefined();
  });

  describe('addPropagateTraceHeaderCorsUrls', () => {
    it('unions the allowlist across instances into the owner', () => {
      claimTracingOwner('app-a');

      const shared = addPropagateTraceHeaderCorsUrls(['https://a.example.com']);
      addPropagateTraceHeaderCorsUrls([/b\.example\.com/]);

      expect(getTracingOwner()?.propagateTraceHeaderCorsUrls).toEqual(['https://a.example.com', /b\.example\.com/]);
      // returns the same shared array the owner registered with, so OTel reads later additions live
      expect(shared).toBe(getTracingOwner()?.propagateTraceHeaderCorsUrls);
    });

    it('is a no-op for undefined urls', () => {
      claimTracingOwner('app-a');

      addPropagateTraceHeaderCorsUrls(undefined);

      expect(getTracingOwner()?.propagateTraceHeaderCorsUrls).toEqual([]);
    });
  });
});
