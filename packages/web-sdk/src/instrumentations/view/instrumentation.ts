import { BaseInstrumentation, Conventions, Meta, MetaView, VERSION } from '@grafana/faro-core';

// all this does is send VIEW_CHANGED event
export class ViewInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-view';
  readonly version = VERSION;

  // previously notified view, to ensure we don't send view changed
  // event twice for the same view
  private notifiedView: MetaView | undefined;

  private sendViewChangedEvent(meta: Meta): void {
    const view = meta.view;

    if (view && view !== this.notifiedView) {
      this.notifiedView = view;

      this.api.pushEvent(Conventions.EventNames.VIEW_CHANGED, {}, undefined, { skipDedupe: true });
    }
  }

  initialize() {
    this.sendViewChangedEvent(this.metas.value);

    this.metas.addListener(this.sendViewChangedEvent.bind(this));
  }
}
