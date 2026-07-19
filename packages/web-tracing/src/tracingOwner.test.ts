import { claimTracingOwner, getTracingOwner, isTracingOwned, resetTracingOwnerForTests } from './tracingOwner';

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
    expect(getTracingOwner()).toEqual({ appName: 'app-a' });
  });

  it('rejects subsequent claims and keeps the first owner', () => {
    expect(claimTracingOwner('app-a')).toBe(true);
    expect(claimTracingOwner('app-b')).toBe(false);
    expect(getTracingOwner()).toEqual({ appName: 'app-a' });
  });

  it('can claim without an app name', () => {
    expect(claimTracingOwner()).toBe(true);
    expect(getTracingOwner()).toEqual({ appName: undefined });
  });
});
