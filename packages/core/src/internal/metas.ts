import type { MetaOverrides, Metas, MetaSession } from '../metas/types';
import type { TransportItem } from '../transports/types';

export type TransportInterceptor = (item: TransportItem, next: (item: TransportItem) => void) => void;
export type SessionCreatedReason = 'start' | 'resume' | 'rotate' | 'explicit';
export interface CreatedSession {
  sessionId: string;
  sampling?: unknown;
}
export type SessionCreatedEvent = { session: CreatedSession; reason: SessionCreatedReason };

/** An explicit session API write, before defaults or existing metadata are merged. */
export type SessionMetaUpdate =
  | { type: 'replace'; session?: MetaSession; overrides?: MetaOverrides }
  | { type: 'overrides'; overrides: MetaOverrides };

/** SDK coordination only; deliberately separate from the public Metas object. */
export interface InternalMetas {
  setInterceptor: (interceptor?: TransportInterceptor) => void;
  intercept: (item: TransportItem, next: (item: TransportItem) => void) => void;
  addSessionCreatedListener: (listener: (event: SessionCreatedEvent) => void) => () => void;
  notifySessionCreated: (session: CreatedSession, reason: SessionCreatedReason) => void;
  getSessionSampling: (sessionId: string) => unknown;
  addSessionUpdateListener: (listener: (update: SessionMetaUpdate) => void) => void;
  removeSessionUpdateListener: (listener: (update: SessionMetaUpdate) => void) => void;
  notifySessionUpdate: (update: SessionMetaUpdate) => void;
  /** Filter signals before API deduplication and buffering, without blocking metadata updates. */
  shouldCapture: () => boolean;
  addCaptureFilter: (filter: () => boolean) => void;
  removeCaptureFilter: (filter: () => boolean) => void;
}

const instances = new WeakMap<Metas, InternalMetas>();
// Separate IIFE bundles each include their own copy of this module. The symbol
// lets those copies share coordination state on the same Metas instance.
const internalMetasKey = Symbol.for('@grafana/faro-core/internal/metas');

/** Share private coordination state between SDK packages without extending faro.metas. */
export function getInternalMetas(metas: Metas): InternalMetas {
  let internal =
    (Object.getOwnPropertyDescriptor(metas, internalMetasKey)?.value as InternalMetas | undefined) ??
    instances.get(metas);
  if (!internal) {
    let sessionUpdateListeners: Array<(update: SessionMetaUpdate) => void> = [];
    let captureFilters: Array<() => boolean> = [];
    let interceptor: TransportInterceptor | undefined;
    const sessionCreatedListeners = new Set<(event: SessionCreatedEvent) => void>();
    let currentSession: CreatedSession | undefined;

    internal = {
      setInterceptor: (nextInterceptor) => {
        interceptor = nextInterceptor;
      },
      intercept: (item, next) => {
        if (interceptor) {
          interceptor(item, next);
        } else {
          next(item);
        }
      },
      addSessionCreatedListener: (listener) => {
        sessionCreatedListeners.add(listener);
        return () => sessionCreatedListeners.delete(listener);
      },
      notifySessionCreated: (session, reason) => {
        currentSession = session;
        for (const listener of sessionCreatedListeners) {
          listener({ session, reason });
        }
      },
      getSessionSampling: (sessionId) =>
        currentSession?.sessionId === sessionId ? currentSession.sampling : undefined,
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
    if (Object.isExtensible(metas)) {
      Object.defineProperty(metas, internalMetasKey, { value: internal });
    }
  }
  return internal;
}
