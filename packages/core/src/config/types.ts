import type { APIEvent, LogArgsSerializer, StacktraceParser } from '../api';
import type { Instrumentation } from '../instrumentations';
import type { InternalLoggerLevel } from '../internalLogger';
import type { Meta, MetaApp, MetaItem, MetaPage, MetaSession, MetaUser, MetaView } from '../metas';
import type { BatchExecutorOptions, BeforeSendHook, Transport, TransportItem } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';
import type { LogLevel } from '../utils';

type SamplingContext = {
  metas: Meta;
};

export interface Config<P = APIEvent> {
  /**
   * Application metadata
   */
  app: MetaApp;

  /**
   * Set max number and max interval for signals to be batched before sending
   */
  batching?: BatchExecutorOptions;

  /**
   * A flag for toggling deduplication for signals
   */
  dedupe: boolean;

  /**
   * The key (name) to use for the global Faro object (default: 'faro')
   */
  globalObjectKey: string;

  /**
   * The (custom) instrumentations to use with Faro
   */
  instrumentations: Instrumentation[];

  /**
   * The level of information printed to console for internal messages (default: LogLevel.ERROR)
   */
  internalLoggerLevel: InternalLoggerLevel;

  /**
   * Isolate Faro instance from other Faro instances on the same page. (default: false)
   */
  isolate: boolean;

  /**
   * Custom function to serialize log arguments
   */
  logArgsSerializer?: LogArgsSerializer;

  /**
   * Add custom Metas during Faro initialization
   */
  metas: MetaItem[];

  /**
   * Custom function used to parse stack traces
   */
  parseStacktrace: StacktraceParser;

  /**
   * Pause sending data (default: false)
   */
  paused: boolean;

  /**
   * Prevent Faro from exposing itself to the global object (default: false)
   */
  preventGlobalExposure: boolean;

  /**
   * The transports to use for sending beacons
   */
  transports: Transport[];

  /**
   * Some instrumentations might override the default console methods but Faro instance provides a
   * way to access the unmodified console methods.
   *
   * faro.unpatchedConsole.log('This is a log');
   * faro.unpatchedConsole.warn('This is a warning');
   */
  unpatchedConsole: UnpatchedConsole;

  /**
   * Function which invoked before pushing event to transport. Can be used to modify or filter events
   */
  beforeSend?: BeforeSendHook<P>;

  /**
   * Error message patterns for errors that should be ignored
   */
  ignoreErrors?: Patterns;

  /**
   * Path patterns for Endpoints that should be ignored form being tracked
   */
  ignoreUrls?: Patterns;

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
   * Meta object for user data
   */
  user?: MetaUser;

  /**
   * Meta object for view data
   */
  view?: MetaView;

  eventDomain?: string;

  /**
   * Only resource timings for fetch and xhr requests are tracked by default. Set this to true to track all resources (default: false).
   */
  trackResources?: boolean;

  /**
   * Configuration for the web vitals instrumentation
   */
  webVitalsInstrumentation?: {
    /**
     * Report all changes for web vitals (default: false)
     *
     * In most cases, you only want the callback function to be called when the metric is ready to be reported.
     * However, it is possible to report every change (e.g. each larger layout shift as it happens)
     * by setting reportAllChanges to true.
     *
     * This can be useful when debugging, but in general using reportAllChanges is not needed (or recommended)
     * for measuring these metrics in production.
     */
    reportAllChanges?: boolean;
  };

  /**
   * Configuration for the console instrumentation
   */
  consoleInstrumentation?: {
    /**
     * Configure what console levels should be captured by Faro. By default the following levels
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
   * Enable or disable geolocation tracking.
   * Geolocation tracking must be enabled in the Grafana Cloud settings first.
   * It cannot be enabled solely on the client side.
   * This option allows control over tracking on the client side to comply with user
   * privacy requirements.
   */
  trackGeolocation?: boolean;

  /**
   * Configuration for the user actions instrumentation
   */
  userActionsInstrumentation?: {
    /**
     * Configure your own attribute name for tracking user actions. Default is 'data-faro-user-action-name'
     */
    dataAttributeName?: string;

    /**
     * Predicate function to exclude items from user actions.
     * If the function returns true, the item will be excluded from user actions.
     */
    excludeItem?: (item: TransportItem<APIEvent>) => boolean;
  };

  /**
   * When enabled, preserves the original Error object in the transport item for use in the beforeSend hook.
   * The original error is automatically removed before the item is sent to the transport.
   *
   * This is useful for error post-processing in (uncontrolled) environments where you need to handle special cases:
   * - Errors from third-party libraries
   * - Errors with missing or incomplete data
   * - Edge cases like `throw undefined` or `throw ''`
   *
   * With access to the original error in the beforeSend hook, you can enhance or modify the
   * Faro exception payload to include additional context or fix missing information.
   */
  preserveOriginalError?: boolean;

  /**
   * Configuration for experimental features.
   * These features have been tested thoroughly, but it is possible that they might not work as expected in all cases.
   */
  experimental?: {
    /**
     * Track navigation events.
     */
    trackNavigation?: boolean;
  };
}

export type Patterns = Array<string | RegExp>;
