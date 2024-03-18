import type { ExceptionStackFrame } from '..';
import { globalObject } from '../globalObject';

export const cachedBundleIdStackFrameMap = new Map<string, ExceptionStackFrame[]>();

export function getBundleId(appName: string) {
  return (globalObject as any)?.[`__faroBundleId_${appName}`];
}

export function getBundleIdStackMap() {
  return (globalObject as any)?.[`__faroBundleIds`] as Map<Error, string> | undefined;
}

export function getBundleIdFromError(error: Error) {
  const stackMap = getBundleIdStackMap();
  if (!stackMap) {
    return;
  }

  return stackMap.get(error ?? '');
}
