import { clampSamplingRate, faro } from '@grafana/faro-core';
import { getInternalMetas } from '@grafana/faro-core/internal';

import type { FaroUserSession, SessionContext } from './sessionManager/types';

type LegacyVerdict = { kept: boolean };

export function isSampled(context: SessionContext = faro): boolean {
  const tracking = context.config.sessionTracking;
  const rawRate = tracking?.sampler?.({ metas: context.metas.value }) ?? tracking?.samplingRate ?? 1;
  const rate = typeof rawRate === 'number' ? clampSamplingRate(rawRate) : 0;

  if (!(rate > 0)) {
    return false;
  }
  if (rate >= 1) {
    return true;
  }

  try {
    const crypto = typeof window !== 'undefined' ? window.crypto : undefined;
    if (typeof crypto?.getRandomValues === 'function') {
      const random = new Uint32Array(1);
      crypto.getRandomValues(random);
      return random[0]! / 2 ** 32 < rate;
    }
  } catch {
    // Fall back when Web Crypto is unavailable.
  }

  return Math.random() < rate;
}

/** Indirection keeps the legacy roll replaceable in tests. */
export const samplingDecision: { isSampled: typeof isSampled } = { isSampled };

/** Keep the existing samplingRate and sampler contract until the rules adapter is installed. */
export function registerLegacySampling(
  context: SessionContext,
  storeUserSession: (session: FaroUserSession) => void,
  recordActivity: (sessionId: string) => void
): () => void {
  const internal = getInternalMetas(context.metas);
  const verdicts = new Map<string, LegacyVerdict>();
  const removeListener = internal.addSessionCreatedListener(({ session, reason }) => {
    const userSession = session as FaroUserSession;
    const stored = userSession.sampling as LegacyVerdict | undefined;
    const legacyStored = (userSession as FaroUserSession & { isSampled?: boolean }).isSampled;
    // An adapter may own a different opaque shape. Never replace it on resume.
    if (reason === 'resume' && userSession.sampling !== undefined && typeof stored?.kept !== 'boolean') {
      return;
    }
    const verdict: LegacyVerdict =
      reason === 'resume' && typeof stored?.kept === 'boolean'
        ? stored
        : reason === 'resume' && typeof legacyStored === 'boolean'
          ? { kept: legacyStored }
          : { kept: samplingDecision.isSampled(context) };

    verdicts.set(session.sessionId, verdict);
    if (userSession.sampling === undefined || legacyStored !== undefined) {
      userSession.sampling = verdict;
      delete (userSession as FaroUserSession & { isSampled?: boolean }).isSampled;
      storeUserSession(userSession);
    }
  });

  internal.setInterceptor((item, next) => {
    const sessionId = item.meta.session?.id;
    const kept = sessionId
      ? (verdicts.get(sessionId)?.kept ?? item.meta.session?.attributes?.['isSampled'] === 'true')
      : false;
    if (kept) {
      const attributes = item.meta.session?.attributes;
      if (attributes && 'isSampled' in attributes) {
        const remainingAttributes = { ...attributes };
        delete remainingAttributes['isSampled'];
        const session = { ...item.meta.session! };
        if (Object.keys(remainingAttributes).length) {
          session.attributes = remainingAttributes;
        } else {
          delete session.attributes;
        }
        next({
          ...item,
          meta: {
            ...item.meta,
            session,
          },
        });
      } else {
        next(item);
      }
    } else if (sessionId) {
      recordActivity(sessionId);
    }
  });

  return () => {
    removeListener();
    internal.setInterceptor();
  };
}
