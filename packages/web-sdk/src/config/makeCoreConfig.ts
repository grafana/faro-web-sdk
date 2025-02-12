import {
  createInternalLogger,
  defaultBatchingConfig,
  defaultGlobalObjectKey,
  defaultInternalLoggerLevel,
  defaultLogArgsSerializer,
  defaultUnpatchedConsole,
  isObject,
} from '@grafana/faro-core';
import type { Config, LogArgsSerializer, LogLevel, MetaItem, MetaPage, Transport } from '@grafana/faro-core';

import { defaultEventDomain } from '../consts';
import { parseStacktrace } from '../instrumentations';
import { defaultSessionTrackingConfig } from '../instrumentations/session';
import { browserMeta } from '../metas';
import { k6Meta } from '../metas/k6';
import { createPageMeta } from '../metas/page';
import { FetchTransport } from '../transports';

import { getWebInstrumentations } from './getWebInstrumentations';
// import type { BrowserConfig } from './types';

//  TODO: move to types file
type WebSdkConfig = Config & {
  /**
   * Only resource timings for fetch and xhr requests are tracked by default. Set this to true to track all resources (default: false).
   */
  trackResources?: boolean;

  /**
   * Track web vitals attribution data (default: false)
   */
  trackWebVitalsAttribution?: boolean;

  /**
   * Configuration for the console instrumentation
   */
  consoleInstrumentation?: {
    /**
     * Configure what console levels should be captured by Faro. By default the follwoing levels
     * are disabled: console.debug, console.trace, console.log
     *
     * If you want to collect all levels set captureConsoleDisabledLevels: [];
     * If you want to disable only some levels set captureConsoleDisabledLevels: [LogLevel.DEBUG, LogLevel.TRACE];
     */
    disabledLevels?: LogLevel[];
    /*
     * By default, Faro sends an error for console.error calls. If you want to send a log instead, set this to true.
     */
    consoleErrorAsLog?: boolean;

    /**
     * If true, use the default Faro error serializer for console.error calls. If false, simply call toString() on the error arguments.
     * If enabled, payloads containing serialized errors may become very large. If left disabled, some error details may be lost.
     * (default: false)
     */
    serializeErrors?: boolean;

    /**
     * Custom function to serialize Error arguments
     */
    errorSerializer?: LogArgsSerializer;
  };

  pageTracking?: {
    /**
     * The page meta for initial page settings
     */
    page?: MetaPage;

    /**
     * Allows to provide a template for the page id
     */
    generatePageId?: (location: Location) => string;
  };

  webTracingInstrumentation?: {
    /**
     * Enable tracing instrumentation (default: true)
     */
    enabled?: boolean;
  };
};

export interface BrowserConfig
  extends Partial<Omit<WebSdkConfig, 'app' | 'parseStacktrace'>>,
    Pick<WebSdkConfig, 'app'> {
  url?: string;
  apiKey?: string;
}

export function makeCoreConfig(browserConfig: BrowserConfig): WebSdkConfig {
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
