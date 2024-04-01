import { globalObject } from '../globalObject';

export function getBundleId(appName: string) {
  return (globalObject as any)?.[`__faroBundleId_${appName}`];
}
