import {
  createInternalLogger,
  defaultBatchingConfig,
  defaultGlobalObjectKey,
  defaultInternalLoggerLevel,
  defaultUnpatchedConsole,
  isObject,
} from '@grafana/faro-core';
import type { Config, MetaItem, Transport } from '@grafana/faro-core';

import { defaultEventDomain } from '../consts';
import { parseStacktrace } from '../instrumentations';
import { MAX_SESSION_PERSISTENCE_TIME } from '../instrumentations/session/sessionManager/sessionManagerUtils';
import { createSession, defaultMetas, defaultViewMeta } from '../metas';
import { k6Meta } from '../metas/k6';
import { FetchTransport } from '../transports';

import { getWebInstrumentations } from './getWebInstrumentations';
import type { BrowserConfig } from './types';

// const defaultSessionPersistenceConfig = {
//   // enabled: true; // TODO:  uncomment once we switch
//   persistent: false,
//   maxSessionPersistenceTime: MAX_SESSION_PERSISTENCE_TIME,
// } as const;

export function makeCoreConfig(browserConfig: BrowserConfig): Config | undefined {
  const transports: Transport[] = [];

  const internalLogger = createInternalLogger(browserConfig.unpatchedConsole, browserConfig.internalLoggerLevel);

  if (browserConfig.transports) {
    if (browserConfig.url || browserConfig.apiKey) {
      internalLogger.error('if "transports" is defined, "url" and "apiKey" should not be defined');
    }

    transports.push(...browserConfig.transports);
  } else if (browserConfig.url) {
    transports.push(
      new FetchTransport({
        url: browserConfig.url,
        apiKey: browserConfig.apiKey,
      })
    );
  } else {
    internalLogger.error('either "url" or "transports" must be defined');
  }

  function createMetas(): MetaItem[] {
    const initialMetas = defaultMetas;

    if (browserConfig.metas) {
      initialMetas.push(...browserConfig.metas);
    }

    const isK6BrowserSession = isObject((window as any).k6);

    if (isK6BrowserSession) {
      return [...initialMetas, k6Meta];
    }

    return initialMetas;
  }

  const config: Config = {
    app: browserConfig.app,
    batching: {
      ...defaultBatchingConfig,
      ...browserConfig.batching,
    },
    dedupe: browserConfig.dedupe ?? true,
    globalObjectKey: browserConfig.globalObjectKey || defaultGlobalObjectKey,
    instrumentations: browserConfig.instrumentations ?? getWebInstrumentations(),
    internalLoggerLevel: browserConfig.internalLoggerLevel ?? defaultInternalLoggerLevel,
    isolate: browserConfig.isolate ?? false,
    metas: createMetas(),
    parseStacktrace,
    paused: browserConfig.paused ?? false,
    preventGlobalExposure: browserConfig.preventGlobalExposure ?? false,
    transports,
    unpatchedConsole: browserConfig.unpatchedConsole ?? defaultUnpatchedConsole,

    beforeSend: browserConfig.beforeSend,
    eventDomain: browserConfig.eventDomain ?? defaultEventDomain,
    ignoreErrors: browserConfig.ignoreErrors,

    sessionTracking: {
      enabled: false,
      persistent: false,
      maxSessionPersistenceTime: MAX_SESSION_PERSISTENCE_TIME,
      ...browserConfig.sessionTracking,

      // TODO: Remove condition at ga
      // session: browserConfig.sessionTracking?.enabled ? createSessionMeta(browserConfig.sessionTracking) : undefined,
    },

    // TODO: deprecate/remove legacy session object at ga
    session: browserConfig.session ?? createSession(),

    user: browserConfig.user,
    view: browserConfig.view ?? defaultViewMeta,
  };

  if (config.sessionTracking?.enabled) {
    delete config.session;
  }

  console.log('config :>> ', config.sessionTracking);

  return config;
}

// function createSessionMeta(sessionsConfig: Config['sessionTracking']): MetaSession {
//   const _sessionsConfig = { ...defaultSessionPersistenceConfig, ...sessionsConfig };
//   const sessionManager = _sessionsConfig.persistent ? PersistentSessionsManager : VolatileSessionsManager;

//   let userSession: FaroUserSession | null = sessionManager.fetchUserSession();

//   if (_sessionsConfig.persistent) {
//     const now = dateNow();

//     const shouldClearPersistentSession =
//       userSession && userSession.lastActivity < now - _sessionsConfig.maxSessionPersistenceTime!;

//     if (shouldClearPersistentSession) {
//       PersistentSessionsManager.removeUserSession();
//       userSession = null;
//     }
//   }

//   let sessionId = _sessionsConfig.session?.id ?? createSession().id;
//   let sessionAttributes = _sessionsConfig.session?.attributes;

//   if (isUserSessionValid(userSession)) {
//     sessionId = userSession?.sessionId;
//     sessionAttributes = userSession?.sessionMeta?.attributes;
//   }

//   const sessionMeta: MetaSession = {
//     id: sessionId ?? createSession().id,
//   };

//   if (sessionAttributes) {
//     sessionMeta.attributes = sessionAttributes;
//   }

//   return sessionMeta;
// }
