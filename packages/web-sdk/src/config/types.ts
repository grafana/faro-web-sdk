import type { Config, LogArgsSerializer, LogLevel, Meta, MetaPage, MetaSession } from '@grafana/faro-core';

export interface BrowserConfig
  extends Partial<Omit<WebSdkConfig, 'app' | 'parseStacktrace'>>,
    Pick<WebSdkConfig, 'app'> {
  url?: string;
  apiKey?: string;
}

export interface GetWebInstrumentationsOptions {
  captureConsole?: boolean;
  captureConsoleDisabledLevels?: LogLevel[];
  enablePerformanceInstrumentation?: boolean;
}

type SamplingContext = {
  metas: Meta;
};

export type WebSdkConfig = {
  /**
   * Configuration for the built in session tracker
   */
  sessionTracking?: {
    /**
     * Enable session tracking (default: true)
     */
    enabled?: boolean;
    /**
     * Wether to use sticky sessions (default: false)
     */
    persistent?: boolean;
    /**
     * Session metadata object to be used when initializing session tracking
     */
    session?: MetaSession;
    /**
     * How long is a sticky session valid for recurring users (default: 15 minutes)
     */
    maxSessionPersistenceTime?: number;
    /**
     * Called each time a session changes. This can be when a new session is created or when an existing session is updated.
     * @param oldSession
     * @param newSession
     */
    onSessionChange?: (oldSession: MetaSession | null, newSession: MetaSession) => void;
    /**
     * Then sampling rate for the session based sampler (default: 1). If a session is not part of a sample, no signals for this session are tracked.
     */
    samplingRate?: number;
    /**
     * Custom sampler function if custom sampling logic is needed.
     * @param context
     */
    sampler?: (context: SamplingContext) => number;
    /**
     * Custom function to generate session id. If available Faro uses this function instead of the internal one.
     */
    generateSessionId?: () => string;
  };

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

  /**
   * Configuration for the page tracking
   */
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

  /**
   * Configuration for the location tracking (Grafana cloud only)
   */
  geoLocationTracking?: {
    /**
     * Enable or disable geolocation tracking.
     * Geolocation tracking must be enabled in the Grafana Cloud settings first.
     * It cannot be enabled solely on the client side.
     * This option allows control over tracking on the client side to comply with user
     * privacy requirements.
     */
    enabled?: boolean;
  };
} & Config;
