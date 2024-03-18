import { cachedBundleIdStackFrameMap, getBundleIdFromError, isError } from '@grafana/faro-core';

import type { ErrorEvent } from '../types';

import { getStackFramesFromError } from './getStackFramesFromError';

export function buildFilenameBundleIdMap(event: ErrorEvent): Map<string, string> | undefined {
  const error = isError(event) ? event : event.error;

  if (!error) {
    return undefined;
  }

  const bundleId = getBundleIdFromError(error);

  if (!bundleId) {
    return undefined;
  }

  const stackFrames = getStackFramesFromError(error);
  cachedBundleIdStackFrameMap.set(bundleId, stackFrames);

  const filenameBundleIdMap = new Map<string, string>();

  return Object.keys(cachedBundleIdStackFrameMap).reduce<Map<string, string>>((acc, bundleId) => {
    const stackFrames = cachedBundleIdStackFrameMap.get(bundleId);

    if (!stackFrames?.length || stackFrames.length === 0) {
      return acc;
    }

    for (let stackFrame of stackFrames) {
      if (stackFrame.filename) {
        acc.set(stackFrame.filename, bundleId);
        break;
      }
    }
    return acc;
  }, filenameBundleIdMap);
}
