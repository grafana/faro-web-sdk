import { globalObject } from '../globalObject';

export function getBundleId(appName: string) {
  return (globalObject as any)?.[`__faroBundleId_${appName}`];
}

export function getBundleIdStackMap() {
  return (globalObject as any)?.[`__faroBundleIds`] as Map<string, string> | undefined;
}

export function getBundleIdFromError(error: Error) {
  const stackMap = getBundleIdStackMap();
  if (!stackMap) {
    return;
  }

  return stackMap.get(error?.stack ?? '');
}
