import { BaseInstrumentation, EVENT_VIEW_CHANGED, unknownString, VERSION } from '@grafana/faro-core';
import type { Meta, MetaView } from '@grafana/faro-core';

// all this does is send VIEW_CHANGED event
export class ViewInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-view';
  readonly version: string = VERSION;

  // previously notified view, to ensure we don't send view changed
  // event twice for the same view
  private notifiedView: MetaView | undefined;
  private waitingForActivation = false;

  private readonly sendViewChangedEvent = (meta: Meta): void => {
    if (this.waitingForActivation || (document as Document & { prerendering?: boolean }).prerendering) {
      return;
    }
    const view = meta.view;

    if (view && view.name !== this.notifiedView?.name) {
      const fromView = this.notifiedView?.name ?? unknownString;
      // Capturing the event can establish the session and notify metas again.
      this.notifiedView = view;
      this.api.pushEvent(
        EVENT_VIEW_CHANGED,
        {
          fromView,
          toView: view.name ?? unknownString,
        },
        undefined,
        { skipDedupe: true }
      );
    }
  };

  private readonly prerenderListener = (): void => {
    // Session activation can temporarily remove pending metadata before replacing
    // it. Wait until activation listeners finish before reporting the current view.
    window.queueMicrotask(() => {
      if (this.waitingForActivation) {
        this.waitingForActivation = false;
        this.sendViewChangedEvent(this.metas.value);
      }
    });
  };

  initialize(): void {
    this.metas.addListener(this.sendViewChangedEvent);
    if ((document as Document & { prerendering?: boolean }).prerendering) {
      this.waitingForActivation = true;
      document.addEventListener('prerenderingchange', this.prerenderListener, { once: true });
    }
  }

  destroy(): void {
    this.waitingForActivation = false;
    this.metas.removeListener(this.sendViewChangedEvent);
    document.removeEventListener('prerenderingchange', this.prerenderListener);
  }
}
