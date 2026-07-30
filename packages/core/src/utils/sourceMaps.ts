import { globalObject } from '../globalObject';

/**
 * Reads the bundle id injected by `@grafana/faro-metro-plugin` / webpack plugin preamble.
 * Prefer `globalObject` (globalThis-first). Also check `window` for older bundles that set the
 * property only on `window` when it differed from `globalThis` (e.g. legacy preamble order).
 */
export function getBundleId(appName: string): string | undefined {
  const key = `__faroBundleId_${appName}`;
  const fromGlobal = (globalObject as any)?.[key];
  if (typeof fromGlobal === 'string' && fromGlobal !== '') {
    return fromGlobal;
  }
  const fromWindow = typeof window !== 'undefined' ? (window as any)[key] : undefined;
  if (typeof fromWindow === 'string' && fromWindow !== '') {
    return fromWindow;
  }
  return undefined;
}

export function getGitHash(appName: string): string | undefined {
  return (globalObject as any)?.[`__faroGitHash_${appName}`];
}
