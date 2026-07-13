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
import { browserMeta, osMeta, sdkMeta } from '../metas';
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
        requestCompression: browserConfig.requestCompression,
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
      storageKeyNamespace: resolveSessionStorageKeyNamespace(browserConfig),
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

/**
 * Resolve the session web-storage key namespace.
 *
 * By default all Faro instances on a page share a single session under the bare storage key.
 * Namespacing is opt-in: set `sessionTracking.isolatedSessions: true` or provide an explicit
 * `sessionTracking.storageKeyNamespace` to namespace the key so co-located instances (e.g. a
 * micro-frontend setup) don't clobber each other's session. Namespace precedence: explicit
 * namespace > app name > app key parsed from the collector URL. Returns `undefined` (bare key)
 * when isolation is not opted into, or when nothing can be resolved.
 *
 * Note: the top-level `isolate` flag (which isolates the Faro global object) intentionally does
 * not affect session storage — that would silently rename the storage key for existing users.
 */
function resolveSessionStorageKeyNamespace(browserConfig: BrowserConfig): string | undefined {
  const { sessionTracking } = browserConfig;

  const explicitNamespace = sessionTracking?.storageKeyNamespace;
  const hasExplicitNamespace = typeof explicitNamespace === 'string' && explicitNamespace.length > 0;

  const shouldIsolateSession = sessionTracking?.isolatedSessions === true || hasExplicitNamespace;

  if (!shouldIsolateSession) {
    return undefined;
  }

  return (
    (hasExplicitNamespace ? explicitNamespace : undefined) ??
    browserConfig.app?.name ??
    getAppKeyFromUrl(browserConfig.url)
  );
}

/**
 * Parse the app key from a Faro collector URL to use as a session storage-key namespace.
 *
 * Collector URLs look like `https://faro-collector-<region>.grafana.net/collect/<appKey>`, so the
 * app key is the last path segment. Any query string or hash is stripped first. Returns `undefined`
 * when no url is provided or no segment can be extracted.
 */
export function getAppKeyFromUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const { pathname } = new URL(url);
    const segments = pathname.split('/').filter(Boolean);
    const collectIndex = segments.lastIndexOf('collect');
    const appKey = collectIndex >= 0 ? segments[collectIndex + 1] : undefined;

    return appKey || undefined;
  } catch {
    // Fallback for non-standard/relative URLs
    const path = url.split('?')[0]!.split('#')[0]!;
    const segments = path.split('/').filter(Boolean);
    const collectIndex = segments.lastIndexOf('collect');
    const appKey = collectIndex >= 0 ? segments[collectIndex + 1] : undefined;

    return appKey || undefined;
  }
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
