import {
  ExceptionStackFrame,
  cachedBundleIdStackFrameMap,
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

  const fileNameBundleIdMap = new Map<string, string>();
  const bundles: Record<string, ExceptionStackFrame[]>[] = [];
  cachedBundleIdStackFrameMap.forEach((value, key) => bundles.push({[key]: value}));

  for (let bundleId of bundles) {
    Object.keys(bundleId).forEach((bundleId) => {
      const stackFrames = cachedBundleIdStackFrameMap.get(bundleId);

      if (!stackFrames?.length || stackFrames.length === 0) {
        return;
      }

      for (let stackFrame of stackFrames) {
        if (stackFrame.filename) {
          fileNameBundleIdMap.set(stackFrame.filename, bundleId);
        }
      }
    });
  }

  return fileNameBundleIdMap;
}
