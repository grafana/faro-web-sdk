import { BaseInstrumentation, faro, Observable, VERSION } from '@grafana/faro-core';

import {
  ActivityWindowTracker,
  isNavigationTransitionEndMessage,
  isNavigationTransitionStartMessage,
  isRequestEndMessage,
  isRequestStartMessage,
} from '../_internal/activityWindowTracker';
import { monitorDomMutations } from '../_internal/monitors/domMutationMonitor';
import { monitorHttpRequests } from '../_internal/monitors/httpRequestMonitor';
import { monitorInteractions } from '../_internal/monitors/interactionMonitor';
import { monitorNavigationTransitions, monitorUrlChanges } from '../_internal/monitors/urlChangeMonitor';
import { performanceObserverSupported } from '../performance/performanceUtils';

export class NavigationInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-navigation';
  readonly version: string = VERSION;

  private cancelHardNavigation?: () => void;

  override initialize(): void {
    const httpMonitor = monitorHttpRequests();
    const domMutationsMonitor = monitorDomMutations();
    const urlMonitor = monitorUrlChanges();
    const navigationTransitionMonitor = monitorNavigationTransitions();
    const interactionMonitor = monitorInteractions(['pointerdown', 'keydown']);

    const activityWindowTracker = new ActivityWindowTracker(
      new Observable().merge(httpMonitor, domMutationsMonitor, urlMonitor, navigationTransitionMonitor),
      {
        inactivityMs: 100,
        drainTimeoutMs: 10 * 1000,
        // A navigation waiting to commit keeps the window open like an in-flight request
        isOperationStart: (msg) => {
          if (isRequestStartMessage(msg)) {
            return msg.request.requestId;
          }
          return isNavigationTransitionStartMessage(msg) ? msg.transitionId : undefined;
        },
        isOperationEnd: (msg) => {
          if (isRequestEndMessage(msg)) {
            return msg.request.requestId;
          }
          return isNavigationTransitionEndMessage(msg) ? msg.transitionId : undefined;
        },
      }
    );

    activityWindowTracker
      .filter((msg) => {
        return msg.message === 'tracking-ended';
      })
      .subscribe((msg) => {
        if (
          msg.events?.some((e: any) => e.type === 'url-change') &&
          msg.events?.some((e: any) => e.type === 'dom-mutation')
        ) {
          const urlChange = msg.events?.find((e: any) => e.type === 'url-change');
          faro.api.pushEvent('faro.navigation', {
            fromUrl: urlChange?.from,
            toUrl: urlChange?.to,
            sameDocument: String(true),
            duration: msg.duration,
          });
        }
      });

    interactionMonitor.subscribe(() => {
      activityWindowTracker.startTracking();
    });

    this.trackHardNavigation();
  }

  destroy(): void {
    this.cancelHardNavigation?.();
    this.cancelHardNavigation = undefined;
  }

  private trackHardNavigation(): void {
    if (!performanceObserverSupported()) {
      return;
    }

    let observer: PerformanceObserver | undefined;
    let cancelled = false;

    const observeNavigationEntry = () => {
      observer = new PerformanceObserver((list) => {
        const [entry] = list.getEntries() as Array<PerformanceNavigationTiming & { activationStart?: number }>;

        if (cancelled || entry == null || entry.loadEventEnd === 0) {
          return;
        }

        cancelled = true;
        observer?.disconnect();

        // prerendered pages count from activation, the time the user actually saw the page
        const duration = Math.max(entry.duration - (entry.activationStart ?? 0), 0);

        faro.api.pushEvent('faro.navigation', {
          fromUrl: document.referrer,
          toUrl: entry.name,
          sameDocument: String(false),
          duration: String(duration),
        });
      });

      try {
        observer.observe({ type: 'navigation', buffered: true });
      } catch {
        observer.disconnect();
        this.logDebug('navigation entries not supported, hard page load navigation is not tracked');
      }
    };

    this.cancelHardNavigation = () => {
      cancelled = true;
      observer?.disconnect();
      document.removeEventListener('prerenderingchange', observeNavigationEntry);
    };

    if ((document as Document & { prerendering?: boolean }).prerendering) {
      document.addEventListener('prerenderingchange', observeNavigationEntry, { once: true });
    } else {
      observeNavigationEntry();
    }
  }
}
