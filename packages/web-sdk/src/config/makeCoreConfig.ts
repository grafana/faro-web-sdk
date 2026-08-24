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
import { defaultInitialActivityTimeout, userActionDataAttribute } from '../instrumentations/userActions/const';
import { normalizeDataAttributeName, normalizeInitialActivityTimeout } from '../instrumentations/userActions/util';
import { browserMeta, osMeta, sdkMeta } from '../metas';
import { k6Meta } from '../metas/k6';
import { createPageMeta } from '../metas/page';
import { FetchTransport } from '../transports';
import { FetchTransport as ReliableFetchTransport } from '../transports/fetch-reliable';

import { getWebInstrumentations } from './getWebInstrumentations';
import type { BrowserConfig } from './types';

export function makeCoreConfig(browserConfig: BrowserConfig): Config {
  const transports: Transport[] = [];

  const internalLogger = createInternalLogger(browserConfig.unpatchedConsole, browserConfig.internalLoggerLevel);

  if (browserConfig.transports) {
    if (browserConfig.url || browserConfig.apiKey) {
      internalLogger.error('if "transports" is defined, "url" and "apiKey" should not be defined');
    }
    if (browserConfig.experimental?.reliableFetchTransport) {
      internalLogger.error(
        'experimental.reliableFetchTransport cannot take effect when explicit "transports" are defined'
      );
    }

    transports.push(...browserConfig.transports);
  } else if (browserConfig.url) {
    const Transport = browserConfig.experimental?.reliableFetchTransport ? ReliableFetchTransport : FetchTransport;
    transports.push(
      new Transport({
        url: browserConfig.url,
        apiKey: browserConfig.apiKey,
        requestCompression: browserConfig.requestCompression,
        ...(browserConfig.experimental?.reliableFetchTransport
          ? browserConfig.reliableFetchTransportOptions
          : undefined),
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
    reliableFetchTransportOptions: _reliableFetchTransportOptions,

    // Properties without default values or which aren't used to create derived config
    ...restProperties
  }: BrowserConfig = browserConfig;

  // Extract experimental features with defaults
  const trackNavigation = experimental?.trackNavigation ?? false;
  const reliableFetchTransport = experimental?.reliableFetchTransport ?? false;

  // Extract user actions instrumentation with defaults
  const userActionsInstrumentation = {
    dataAttributeName: normalizeDataAttributeName(
      browserConfig.userActionsInstrumentation?.dataAttributeName ?? userActionDataAttribute
    ),
    excludeItem: browserConfig.userActionsInstrumentation?.excludeItem,
    initialActivityTimeout: normalizeInitialActivityTimeout(
      browserConfig.userActionsInstrumentation?.initialActivityTimeout,
      defaultInitialActivityTimeout,
      (message) => internalLogger.warn(message)
    ),
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
      reliableFetchTransport,
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
    osMeta,
    createPageMeta({ generatePageId, initialPageMeta: page }),
    ...(browserConfig.metas ?? []),
    sdkMeta,
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
