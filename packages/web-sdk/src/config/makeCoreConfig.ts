import {
  createInternalLogger,
  defaultBatchingConfig,
  defaultGlobalObjectKey,
  defaultInternalLoggerLevel,
  defaultUnpatchedConsole,
  isObject,
} from '@grafana/faro-core';
import type { Config, MetaSession, Transport } from '@grafana/faro-core';

import type { MetaItem } from '..';
import { defaultEventDomain } from '../consts';
import { parseStacktrace } from '../instrumentations';
import { fetchUserSession, isUserSessionValid } from '../instrumentations/session';
import { createSession, defaultMetas, defaultViewMeta } from '../metas';
import { k6Meta } from '../metas/k6';
import { FetchTransport } from '../transports';

import { getWebInstrumentations } from './getWebInstrumentations';
import type { BrowserConfig } from './types';

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

  return {
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

    // The new session management feature is a PoC and still under development and IS NOT READY for any production use!
    experimentalSessions: {
      // TODO: will be true on release
      enabled: false,
      persistent: false,
      session: createSessionMeta(),
      ...browserConfig.experimentalSessions,
    },

    // TODO: deprecate/remove old init code or maybe rename to legacy_session?
    session: browserConfig.session ?? createSession(),

    user: browserConfig.user,
    view: browserConfig.view ?? defaultViewMeta,
  };
}

function createSessionMeta(): MetaSession {
  const userSession = fetchUserSession();
  const sessionId = isUserSessionValid(userSession) ? userSession?.sessionId : createSession().id;

  return {
    id: sessionId,
  };
}
