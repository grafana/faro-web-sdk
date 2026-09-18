import type { MetaOverrides, Metas, MetaSession } from '../metas/types';

/** An explicit session API write, before defaults or existing metadata are merged. */
export type SessionMetaUpdate =
  | { type: 'replace'; session?: MetaSession; overrides?: MetaOverrides }
  | { type: 'overrides'; overrides: MetaOverrides };

/** SDK coordination only; deliberately separate from the public Metas object. */
export interface InternalMetas {
  addSessionUpdateListener: (listener: (update: SessionMetaUpdate) => void) => void;
  removeSessionUpdateListener: (listener: (update: SessionMetaUpdate) => void) => void;
  notifySessionUpdate: (update: SessionMetaUpdate) => void;
  /** Filter signals before API deduplication and buffering, without blocking metadata updates. */
  shouldCapture: () => boolean;
  addCaptureFilter: (filter: () => boolean) => void;
  removeCaptureFilter: (filter: () => boolean) => void;
}

const instances = new WeakMap<Metas, InternalMetas>();

/** Share private coordination state between SDK packages without extending faro.metas. */
export function getInternalMetas(metas: Metas): InternalMetas {
  let internal = instances.get(metas);
  if (!internal) {
    let sessionUpdateListeners: Array<(update: SessionMetaUpdate) => void> = [];
    let captureFilters: Array<() => boolean> = [];

    internal = {
      addSessionUpdateListener: (listener) => {
        sessionUpdateListeners.push(listener);
      },
      removeSessionUpdateListener: (listener) => {
        sessionUpdateListeners = sessionUpdateListeners.filter((current) => current !== listener);
      },
      notifySessionUpdate: (update) => {
        sessionUpdateListeners.forEach((listener) => listener(update));
      },
      shouldCapture: () => captureFilters.every((filter) => filter()),
      addCaptureFilter: (filter) => {
        captureFilters.push(filter);
      },
      removeCaptureFilter: (filter) => {
        captureFilters = captureFilters.filter((current) => current !== filter);
      },
    };
    instances.set(metas, internal);
  }
  return internal;
}
