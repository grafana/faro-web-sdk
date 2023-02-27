import { BaseInstrumentation, Conventions, Meta, MetaSession, VERSION } from '@grafana/faro-core';

// all this does is send SESSION_START event
export class SessionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-session';
  readonly version = VERSION;

  // previously notified session, to ensure we don't send session start
  // event twice for the same session
  private notifiedSession: MetaSession | undefined;

  private sendSessionStartEvent(meta: Meta): void {
    const session = meta.session;

    if (session && session !== this.notifiedSession) {
      this.notifiedSession = session;
      // no need to add attributes and session id, they are included as part of meta
      // automatically
      this.api.pushEvent(Conventions.EventNames.SESSION_START, {}, undefined, { skipDedupe: true });
    }
  }

  initialize() {
    this.sendSessionStartEvent(this.metas.value);

    this.metas.addListener(this.sendSessionStartEvent.bind(this));
  }
}
