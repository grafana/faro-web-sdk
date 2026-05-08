import { matchRoutes } from 'react-router';

import {
  initializeFaro as coreInit,
  createReactRouterV7DataOptions,
  genShortID,
  getWebInstrumentations,
  ReactIntegration,
  TransportItemType,
} from '@grafana/faro-react';
import type { Faro, LogEvent, TransportItem } from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

import { env } from '../utils/env';

const TAB_ID_STORAGE_KEY = 'com.grafana.faro.tabId';
const TAB_PRESENCE_CHANNEL_NAME = 'faro-tab-presence';

// Storage access can throw (Safari private mode, disabled storage, quota).
// Degrade silently rather than break Faro init.
function safeSessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // storage unavailable or quota exceeded
  }
}

// Persistent sessions live in localStorage, so every tab shares the same
// `meta.session.id`. The tab id, persisted in per-tab sessionStorage, lets
// us distinguish signals from individual tabs.
function getOrCreateTabId(): string {
  const stored = safeSessionGet(TAB_ID_STORAGE_KEY);

  if (stored) {
    return stored;
  }

  const fresh = genShortID();
  safeSessionSet(TAB_ID_STORAGE_KEY, fresh);

  return fresh;
}

// Merge tabId into the current session meta so we don't drop the existing
// id, attributes, or overrides. The session manager preserves user-set
// attributes across session rotations, so this only needs to be called
// once at init and again on collision rotation.
function applyTabIdToSession(faro: Faro, tabId: string): void {
  const current = faro.api.getSession() ?? {};

  faro.api.setSession({
    ...current,
    attributes: {
      ...current.attributes,
      tabId,
    },
  });
}

type TabPresenceMessage = {
  kind: 'hello';
  tabId: string;
  // Per-channel sender id, lets us ignore our own broadcasts.
  from: string;
};

// Chromium and Firefox copy sessionStorage when a tab is duplicated, so the
// duplicate boots with the same tab id. Detect that via a BroadcastChannel
// heartbeat and rotate to a fresh id on collision.
function wireUpTabIdCollisionDetection(faro: Faro, initialTabId: string): void {
  if (typeof BroadcastChannel === 'undefined') {
    return;
  }

  let tabId = initialTabId;
  const channel = new BroadcastChannel(TAB_PRESENCE_CHANNEL_NAME);
  const selfId = genShortID();

  const announce = () => {
    const message: TabPresenceMessage = {
      kind: 'hello',
      tabId,
      from: selfId,
    };

    channel.postMessage(message);
  };

  channel.addEventListener('message', (event: MessageEvent<TabPresenceMessage>) => {
    const message = event.data;

    if (!message || message.kind !== 'hello' || message.from === selfId) {
      return;
    }

    if (message.tabId === tabId) {
      // Another tab is using our id. Rotate, persist, re-apply, re-announce.
      tabId = genShortID();
      safeSessionSet(TAB_ID_STORAGE_KEY, tabId);
      applyTabIdToSession(faro, tabId);
      announce();
    }
  });

  announce();
}

export function initializeFaro(): Faro {
  const tabId = getOrCreateTabId();

  const faro = coreInit({
    url: `http://localhost:${env.faro.portAppReceiver}/collect`,
    apiKey: env.faro.apiKey,

    instrumentations: [
      ...getWebInstrumentations({
        captureConsole: true,
      }),

      new TracingInstrumentation(),
      new ReactIntegration({
        router: createReactRouterV7DataOptions({
          matchRoutes,
        }),
      }),
    ],
    app: {
      name: env.client.packageName,
      namespace: env.client.packageNamespace,
      version: env.package.version,
      environment: env.mode.name,
    },

    trackResources: true,

    batching: {
      itemLimit: 100,
    },

    // Drop specific noisy log messages. Return null to skip an item.
    beforeSend: (item: TransportItem) => {
      if (item.type === TransportItemType.LOG) {
        const message = String((item.payload as LogEvent).message ?? '');

        if (message === 'Faro was initialized') {
          return null;
        }
      }

      return item;
    },
  });

  applyTabIdToSession(faro, tabId);
  wireUpTabIdCollisionDetection(faro, tabId);

  // Dropped by the beforeSend filter above.
  faro.api.pushLog(['Faro was initialized']);
  // Reaches the transport.
  faro.api.pushLog(['Faro init complete - filter active']);
  faro.api.pushLog([`Tab id: ${tabId}`]);

  return faro;
}
