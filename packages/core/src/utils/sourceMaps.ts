import { globalObject } from '../globalObject';

export function getBundleId(appName: string): string | undefined {
  return (globalObject as any)?.[`__faroBundleId_${appName}`];
}

export function getGitHash(appName: string): string | undefined {
  return (globalObject as any)?.[`__faroGitHash_${appName}`];
}
