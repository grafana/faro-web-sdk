import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { NAVIGATION_BACK, NAVIGATION_EVENT_TYPE, NAVIGATION_FORWARD, NAVIGATION_GO, NAVIGATION_HASHCHANGE, NAVIGATION_NAVIGATE, NAVIGATION_POPSTATE, NAVIGATION_PUSH_STATE, NAVIGATION_REPLACE_STATE } from './consts';
import type { Navigation } from './types';

export class NavigationInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-navigation';
  readonly version = VERSION;
  readonly originalHistory: History = window.history;
  readonly originalNavigation: Navigation = window.navigation;

  private currentUrl: string | null = null;
  private currentHash: string | null = null;

  initialize() {
    console.log('NavigationInstrumentation initialized', {
      originalHistory: window.history,
      originalNavigation: window.navigation,
    });

    if (this.originalNavigation) {
      this.internalLogger.info('Instrumenting navigation');
      this.instrumentNavigation();
    } else {
      this.internalLogger.info('Instrumenting history');
      this.instrumentHistory();
    }

    this.currentUrl = window.location.href;
  }

  private setCurrentUrl(url: string) {
    this.currentUrl = url;
  }

  private setCurrentHash(hash: string) {
    this.currentHash = hash;
  }

  // Sets up instrumentation for browser navigation events and history API methods
  private instrumentHistory() {
    const instrumentation = this;

    const originalPushState = instrumentation.originalHistory.pushState;
    const originalReplaceState = instrumentation.originalHistory.replaceState;
    const originalForward = instrumentation.originalHistory.forward;
    const originalBack = instrumentation.originalHistory.back;
    const originalGo = instrumentation.originalHistory.go;

    instrumentation.originalHistory.pushState = function (state, title, url) {
      const toUrl = url ? String(url) : '';
      const fromUrl = instrumentation.currentUrl ?? '';
      originalPushState.apply(instrumentation.originalHistory, [state, title, toUrl]);
      instrumentation.api.pushEvent(NAVIGATION_PUSH_STATE, {
        type: NAVIGATION_EVENT_TYPE,
        state,
        title,
        fromUrl,
        toUrl,
      });
      instrumentation.setCurrentUrl(toUrl);
    };

    instrumentation.originalHistory.replaceState = function (state, title, url) {
      const toUrl = url ? String(url) : '';
      const fromUrl = instrumentation.currentUrl ?? '';
      originalReplaceState.apply(instrumentation.originalHistory, [state, title, url]);
      instrumentation.api.pushEvent(NAVIGATION_REPLACE_STATE, {
        type: NAVIGATION_EVENT_TYPE,
        state,
        title,
        fromUrl,
        toUrl,
      });
      instrumentation.setCurrentUrl(toUrl);
    };

    instrumentation.originalHistory.forward = function () {
      originalForward.apply(instrumentation.originalHistory, []);
      instrumentation.api.pushEvent(NAVIGATION_FORWARD, {
        type: NAVIGATION_EVENT_TYPE,
      });
    };

    instrumentation.originalHistory.back = function () {
      originalBack.apply(instrumentation.originalHistory, []);
      instrumentation.api.pushEvent(NAVIGATION_BACK, {
        type: NAVIGATION_EVENT_TYPE,
      });
    };

    instrumentation.originalHistory.go = function (delta) {
      originalGo.apply(instrumentation.originalHistory, [delta]);
      instrumentation.api.pushEvent(NAVIGATION_GO, {
        type: NAVIGATION_EVENT_TYPE,
        delta: delta ? String(delta) : '',
      });
    };

    window.addEventListener('popstate', (event) => {
      // @ts-expect-error - event.target is not typed
      const toUrl = event.target?.location.href ?? window.location.href ?? '';
      instrumentation.api.pushEvent(NAVIGATION_POPSTATE, {
        type: NAVIGATION_EVENT_TYPE,
        fromUrl: instrumentation.currentUrl ?? '',
        toUrl,
      });
      instrumentation.setCurrentUrl(toUrl);
    });

    window.addEventListener('hashchange', (event) => {
      const toHash = new URL(event.newURL).hash ?? '';
      const fromHash = instrumentation.currentHash ?? '';
      instrumentation.api.pushEvent(NAVIGATION_HASHCHANGE, {
        type: NAVIGATION_EVENT_TYPE,
        fromUrl: event.oldURL ?? '',
        toUrl: event.newURL ?? '',
        fromHash,
        toHash,
      });
      instrumentation.setCurrentHash(toHash);
    });
  }

  // Sets up instrumentation for navigation.navigate events (not as widely supported as history API)
  private instrumentNavigation() {
    const instrumentation = this;

    instrumentation.originalNavigation.addEventListener('navigate', (event) => {
      const fromUrl = instrumentation.currentUrl ?? '';
      const toUrl = event.destination.url;

      const eventType = `${NAVIGATION_NAVIGATE}.${event.navigationType}`;

      instrumentation.api.pushEvent(eventType, {
        type: eventType,
        fromUrl,
        toUrl,
        navigationType: event.navigationType,
        userInitiated: event.userInitiated.toString(),
        canIntercept: event.canIntercept.toString() ?? '',
        signal: this.getSignalDetails(event.signal),
        hashChange: event.hashChange.toString(),
        formData: event.formData?.toString() ?? '',
      });
    });
  }

  private getSignalDetails(signal: AbortSignal) {
    return `aborted: ${signal.aborted.toString()}, reason: ${signal.reason?.toString() ?? 'N/A'}`
  }
}