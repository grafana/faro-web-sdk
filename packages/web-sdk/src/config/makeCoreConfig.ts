import {
  createInternalLogger,
  defaultBatchingConfig,
  defaultGlobalObjectKey,
  defaultInternalLoggerLevel,
  defaultLogArgsSerializer,
  defaultUnpatchedConsole,
  isEmpty,
  isObject,
} from '@grafana/faro-core';
import type { Config, MetaItem, MetaSession, Transport } from '@grafana/faro-core';

import { defaultEventDomain } from '../consts';
import { parseStacktrace } from '../instrumentations';
import { defaultSessionTrackingConfig } from '../instrumentations/session';
import { browserMeta } from '../metas';
import { k6Meta } from '../metas/k6';
import { createPageMeta } from '../metas/page';
import { FetchTransport } from '../transports';

import { getWebInstrumentations } from './getWebInstrumentations';
import type { BrowserConfig } from './types';

export function makeCoreConfig(browserConfig: BrowserConfig): Config {
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

  const {
    app,
    batching,
    beforeSend,
    consoleInstrumentation,
    ignoreErrors,
    sessionTracking,
    trackResources,
    trackWebVitalsAttribution,
    user,
    view,
    locationTracking,

    // properties with default values
    dedupe = true,
    eventDomain = defaultEventDomain,
    globalObjectKey = defaultGlobalObjectKey,
    instrumentations = getWebInstrumentations(),
    internalLoggerLevel = defaultInternalLoggerLevel,
    isolate = false,
    logArgsSerializer = defaultLogArgsSerializer,
    metas = createDefaultMetas(browserConfig),
    paused = false,
    preventGlobalExposure = false,
    unpatchedConsole = defaultUnpatchedConsole,
  }: BrowserConfig = browserConfig;

  return {
    app,
    batching: {
      ...defaultBatchingConfig,
      ...batching,
    },
    dedupe: dedupe,
    globalObjectKey,
    instrumentations,
    internalLoggerLevel,
    isolate,
    logArgsSerializer,
    metas,
    parseStacktrace,
    paused,
    preventGlobalExposure,
    transports,
    unpatchedConsole,
    beforeSend,
    eventDomain,
    ignoreErrors,
    // ignore cloud collector urls by default. These are URLs ending with /collect or /collect/ followed by alphanumeric characters.
    ignoreUrls: (browserConfig.ignoreUrls ?? []).concat([/\/collect(?:\/[\w]*)?$/]),
    sessionTracking: {
      ...defaultSessionTrackingConfig,
      ...sessionTracking,
      ...crateSessionMeta({ locationTracking, sessionTracking }),
    },
    user,
    view,
    trackResources,
    trackWebVitalsAttribution,
    consoleInstrumentation,
  };
}

function createDefaultMetas(browserConfig: BrowserConfig): MetaItem[] {
  const { page, generatePageId } = browserConfig?.pageTracking ?? {};

  const initialMetas: MetaItem[] = [
    browserMeta,
    createPageMeta({ generatePageId, initialPageMeta: page }),
    ...(browserConfig.metas ?? []),
  ];

  const isK6BrowserSession = isObject((window as any).k6);
  if (isK6BrowserSession) {
    return [...initialMetas, k6Meta];
  }

  return initialMetas;
}

function crateSessionMeta({
  locationTracking,
  sessionTracking,
}: Pick<BrowserConfig, 'locationTracking' | 'sessionTracking'>): { session: MetaSession } | {} {
  const overrides: MetaSession['overrides'] = {};

  if (locationTracking?.enabled != null) {
    overrides.geolocationTrackingEnabled = locationTracking.enabled;
  }

  if (isEmpty(overrides)) {
    return {};
  }

  return {
    session: {
      ...(sessionTracking?.session ?? {}),
      overrides,
    },
  };
}
