import {
  ExceptionStackFrame,
  cachedBundleIdStackFrameMap,
  cachedFileNameBundleIdMap,
  getBundleIdFromError,
  isError,
} from '@grafana/faro-core';

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

  const bundles: Record<string, ExceptionStackFrame[]>[] = [];
  cachedBundleIdStackFrameMap.forEach((value, key) => bundles.push({[key]: value}));

  for (let bundleId of bundles) {
    Object.keys(bundleId).forEach((bundleId) => {
      const stackFrames = cachedBundleIdStackFrameMap.get(bundleId);

      console.log('FRAMES:', JSON.stringify(stackFrames));

      if (!stackFrames?.length || stackFrames.length === 0) {
        return;
      }

      for (let stackFrame of stackFrames) {
        if (stackFrame.filename) {
          cachedFileNameBundleIdMap.set(stackFrame.filename, bundleId);
        }
      }
    });
  }

  return cachedFileNameBundleIdMap;
}
