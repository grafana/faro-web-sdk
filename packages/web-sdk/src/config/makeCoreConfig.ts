import {
  createInternalLogger,
  defaultBatchingConfig,
  defaultGlobalObjectKey,
  defaultInternalLoggerLevel,
  defaultLogArgsSerializer,
  defaultUnpatchedConsole,
  isBoolean,
  isEmpty,
  isObject,
} from '@grafana/faro-core';
import type { Config, Instrumentation, MetaItem, MetaSession, Transport } from '@grafana/faro-core';

import { defaultEventDomain } from '../consts';
import { parseStacktrace } from '../instrumentations';
import { defaultSessionTrackingConfig } from '../instrumentations/session';
import { userActionDataAttribute } from '../instrumentations/userActions/const';
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
    url: browserConfigUrl,
    experimental,
    // Properties without default values or which aren't used to create derived config
    ...restProperties
  }: BrowserConfig = browserConfig;

  // Extract experimental features with defaults
  const trackNavigation = experimental?.trackNavigation ?? false;

  // Extract user actions instrumentation with defaults
  const userActionsInstrumentation = {
    dataAttributeName: browserConfig.userActionsInstrumentation?.dataAttributeName ?? userActionDataAttribute,
    excludeItem: browserConfig.userActionsInstrumentation?.excludeItem,
  };

  return {
    ...restProperties,

    batching: {
      ...defaultBatchingConfig,
      ...browserConfig.batching,
    },
    dedupe: dedupe,
    globalObjectKey,
    instrumentations: getFilteredInstrumentations(instrumentations, browserConfig),
    internalLoggerLevel,
    isolate,
    logArgsSerializer,
    metas,
    parseStacktrace,
    paused,
    preventGlobalExposure,
    transports,
    unpatchedConsole,
    eventDomain,
    ignoreUrls: [
      ...(browserConfig.ignoreUrls ?? []),
      // ignore configured cloud collector url by default
      ...(browserConfigUrl ? [browserConfigUrl] : []),
      // Try our best to exclude collector URLs form other Faro instances. By default these are URLs ending with /collect or /collect/ followed by alphanumeric characters.
      /\/collect(?:\/[\w]*)?$/,
    ],
    sessionTracking: {
      ...defaultSessionTrackingConfig,
      ...browserConfig.sessionTracking,
      ...crateSessionMeta({
        trackGeolocation: browserConfig.trackGeolocation,
        sessionTracking: browserConfig.sessionTracking,
      }),
    },
    userActionsInstrumentation,
    experimental: {
      trackNavigation,
    },
  };
}

function getFilteredInstrumentations(
  instrumentations: Instrumentation[],
  { experimental }: BrowserConfig
): Instrumentation[] {
  const trackNavigation = experimental?.trackNavigation ?? false;

  return instrumentations.filter((instr) => {
    if (instr.name === '@grafana/faro-web-sdk:instrumentation-navigation' && !trackNavigation) {
      return false;
    }
    return true;
  });
}

function createDefaultMetas(browserConfig: BrowserConfig): MetaItem[] {
  const { page, generatePageId } = browserConfig?.pageTracking ?? {};

  const initialMetas: MetaItem[] = [
    browserMeta,
    createPageMeta({ generatePageId, initialPageMeta: page }),
    ...(browserConfig.metas ?? []),
  ];

  const isK6BrowserSession = isObject((window as any)?.k6);
  if (isK6BrowserSession) {
    return [...initialMetas, k6Meta];
  }

  return initialMetas;
}

function crateSessionMeta({
  trackGeolocation,
  sessionTracking,
}: Pick<BrowserConfig, 'trackGeolocation' | 'sessionTracking'>): { session: MetaSession } | {} {
  const overrides: MetaSession['overrides'] = {};

  if (isBoolean(trackGeolocation)) {
    overrides.geoLocationTrackingEnabled = trackGeolocation;
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
