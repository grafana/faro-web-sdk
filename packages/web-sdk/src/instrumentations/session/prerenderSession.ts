import { isEmpty, type Metas, type MetaSession, type SessionMetaUpdate, type Transports } from '@grafana/faro-core';

export interface PendingSessionChanges {
  reset: boolean;
  session: MetaSession;
}

/** Holds explicit API writes and blocks telemetry until the prerender is activated. */
export class PrerenderSession {
  private pending: PendingSessionChanges | undefined;
  private waiting = false;

  constructor(
    private metas: Metas,
    private transports: Transports,
    private onActivate: (changes?: PendingSessionChanges) => void
  ) {}

  private readonly shouldCapture = () => !(document as Document & { prerendering?: boolean }).prerendering;
  private readonly discard = () => null;

  private readonly recordUpdate = (update: SessionMetaUpdate): void => {
    const previous = this.pending;
    if (update.type === 'overrides') {
      this.pending = {
        reset: previous?.reset ?? false,
        session: {
          ...previous?.session,
          overrides: { ...previous?.session.overrides, ...update.overrides },
        },
      };
      return;
    }

    const session = update.session;
    const reset = isEmpty(session) || (session != null && 'id' in session && !session.id);
    this.pending = {
      reset: reset || (!session?.id && (previous?.reset ?? false)),
      session: {
        id: session?.id,
        attributes: session?.attributes && { ...session.attributes },
        overrides: update.overrides
          ? { ...previous?.session.overrides, ...update.overrides }
          : session?.overrides && { ...session.overrides },
      },
    };
  };

  private readonly activate = (): void => {
    if (!this.waiting || !this.shouldCapture()) {
      return;
    }
    this.destroy();
    this.onActivate(this.pending);
  };

  initialize(): void {
    this.waiting = true;
    this.metas.addSessionUpdateListener?.(this.recordUpdate);
    this.metas.addCaptureFilter?.(this.shouldCapture);
    this.transports.addBeforeSendHooks(this.discard);
    document.addEventListener('prerenderingchange', this.activate);
    // Earlier activation listeners can emit web vitals before our DOM listener runs.
    this.metas.addCaptureListener?.(this.activate);
  }

  destroy(): void {
    this.waiting = false;
    document.removeEventListener('prerenderingchange', this.activate);
    this.metas.removeSessionUpdateListener?.(this.recordUpdate);
    this.metas.removeCaptureListener?.(this.activate);
    this.metas.removeCaptureFilter?.(this.shouldCapture);
    this.transports.removeBeforeSendHooks(this.discard);
  }
}
