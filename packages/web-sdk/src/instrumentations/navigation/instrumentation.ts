import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { NAVIGATION_BACK, NAVIGATION_EVENT_TYPE, NAVIGATION_FORWARD, NAVIGATION_GO, NAVIGATION_HASHCHANGE, NAVIGATION_POPSTATE, NAVIGATION_PUSH_STATE, NAVIGATION_REPLACE_STATE } from './consts';
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

    this.instrumentHistory();
    this.currentUrl = window.location.href;
  }

  private setCurrentUrl(url: string) {
    this.currentUrl = url;
  }

  private setCurrentHash(hash: string) {
    this.currentHash = hash;
  }

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
}