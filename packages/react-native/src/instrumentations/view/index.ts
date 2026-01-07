import { BaseInstrumentation, EVENT_VIEW_CHANGED, unknownString, VERSION } from '@grafana/faro-core';
import type { Meta, MetaView } from '@grafana/faro-core';

/**
 * View instrumentation for React Native
 * Tracks screen/view changes
 *
 * This instrumentation listens to meta changes and emits VIEW_CHANGED events
 * when the screen/view changes. The actual screen tracking is handled by
 * the navigation integration utilities (useFaroNavigation hook).
 */
export class ViewInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native:instrumentation-view';
  readonly version = VERSION;

  // previously notified view, to ensure we don't send view changed
  // event twice for the same view
  private notifiedView: MetaView | undefined;
  private metaUnsubscribe: (() => void) | undefined;

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

  initialize(): void {
    this.metaUnsubscribe = this.metas.addListener(this.sendViewChangedEvent.bind(this));
    this.logInfo('View instrumentation initialized');
  }

  /**
   * Clean up meta listener
   */
  unpatch(): void {
    if (this.metaUnsubscribe) {
      this.metaUnsubscribe();
      this.metaUnsubscribe = undefined;
    }
  }
}
