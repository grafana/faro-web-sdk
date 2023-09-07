import { BaseInstrumentation, Conventions, Meta, MetaSession, VERSION } from '@grafana/faro-core';

import { getSessionManager, SessionManager } from './sessionManager';

export class SessionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-session';
  readonly version = VERSION;

  // previously notified session, to ensure we don't send session start
  // event twice for the same session
  private notifiedSession: MetaSession | undefined;

  private sessionManager: SessionManager | undefined;

  private sendSessionStartEvent(meta: Meta): void {
    const session = meta.session;

    if (session && session.id !== this.notifiedSession?.id) {
      this.notifiedSession = session;

      // no need to add attributes and session id, they are included as part of meta
      // automatically
      this.api.pushEvent(Conventions.EventNames.SESSION_START, {}, undefined, { skipDedupe: true });
    }
  }

  initialize() {
    this.logDebug('init session instrumentation');

    this.sendSessionStartEvent(this.metas.value);
    this.metas.addListener(this.sendSessionStartEvent.bind(this));

    if (this.config.experimental_sessions_enabled) {
      this.sessionManager = getSessionManager(this.metas.value.session?.id);
      this.transports?.addBeforeSendHooks(...this.transports.getBeforeSendHooks(), (item: any) => {
        this.sessionManager?.onActivity();
        return item;
      });
    }
  }
}
