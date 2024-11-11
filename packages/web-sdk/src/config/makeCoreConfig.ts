import {
  createInternalLogger,
  defaultBatchingConfig,
  defaultGlobalObjectKey,
  defaultInternalLoggerLevel,
  defaultLogArgsSerializer,
  defaultUnpatchedConsole,
  isObject,
} from '@grafana/faro-core';
import type { Config, MetaItem, Transport } from '@grafana/faro-core';

import { defaultEventDomain } from '../consts';
import { parseStacktrace } from '../instrumentations';
import { defaultSessionTrackingConfig } from '../instrumentations/session';
import { defaultMetas } from '../metas';
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
    logArgsSerializer: browserConfig.logArgsSerializer ?? defaultLogArgsSerializer,
    metas: createMetas(),
    parseStacktrace,
    paused: browserConfig.paused ?? false,
    preventGlobalExposure: browserConfig.preventGlobalExposure ?? false,
    transports,
    unpatchedConsole: browserConfig.unpatchedConsole ?? defaultUnpatchedConsole,

    beforeSend: browserConfig.beforeSend,
    eventDomain: browserConfig.eventDomain ?? defaultEventDomain,
    ignoreErrors: browserConfig.ignoreErrors,
    // ignore cloud collector urls by default. These are URLs ending with /collect or /collect/ followed by alphanumeric characters.
    ignoreUrls: (browserConfig.ignoreUrls ?? []).concat([/\/collect(?:\/[\w]*)?$/]),

    sessionTracking: {
      ...defaultSessionTrackingConfig,
      ...browserConfig.sessionTracking,
    },

    user: browserConfig.user,
    view: browserConfig.view,
    trackResources: browserConfig.trackResources,
    trackWebVitalsAttribution: browserConfig.trackWebVitalsAttribution,
    consoleInstrumentation: browserConfig.consoleInstrumentation,
  };

  return config;
}
