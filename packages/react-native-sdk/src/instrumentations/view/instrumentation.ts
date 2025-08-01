import { BaseInstrumentation, EVENT_VIEW_CHANGED, Meta, MetaView, unknownString, VERSION } from '@grafana/faro-core';

// all this does is send VIEW_CHANGED event
export class ViewInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-view';
  readonly version = VERSION;

  // previously notified view, to ensure we don't send view changed
  // event twice for the same view
  private notifiedView: MetaView | undefined;

  private sendViewChangedEvent(meta: Meta): void {
    const view = meta.view;

    if (view && view.name !== this.notifiedView?.name) {
      this.api.pushEvent(
        EVENT_VIEW_CHANGED,
        {
          fromView: this.notifiedView?.name ?? unknownString,
          toView: view.name ?? unknownString,
        },
        undefined,
        { skipDedupe: true }
      );

      this.notifiedView = view;
    }
  }

  initialize() {
    this.metas.addListener(this.sendViewChangedEvent.bind(this));
  }
}
