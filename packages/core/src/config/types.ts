import type { APIEvent, LogArgsSerializer, StacktraceParser } from '../api';
import type { Instrumentation } from '../instrumentations';
import type { InternalLoggerLevel } from '../internalLogger';
import type { Meta, MetaApp, MetaItem, MetaSession, MetaUser, MetaView } from '../metas';
import type { BatchExecutorOptions, BeforeSendHook, Transport } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';

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
   * Meta object for user data
   */
  user?: MetaUser;

  /**
   * Meta object for view data
   */
  view?: MetaView;

  eventDomain?: string;
}

export type Patterns = Array<string | RegExp>;
