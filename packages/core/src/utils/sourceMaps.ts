import { globalObject } from '../globalObject';

export function getBundleId(appName: string): string | undefined {
  return (globalObject as any)?.[`__faroBundleId_${appName}`];
}
