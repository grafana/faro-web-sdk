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
  app: MetaApp;
  batching?: BatchExecutorOptions;
  dedupe: boolean;
  globalObjectKey: string;
  instrumentations: Instrumentation[];
  internalLoggerLevel: InternalLoggerLevel;
  isolate: boolean;
  logArgsSerializer?: LogArgsSerializer;
  metas: MetaItem[];
  parseStacktrace: StacktraceParser;
  paused: boolean;
  preventGlobalExposure: boolean;
  transports: Transport[];
  unpatchedConsole: UnpatchedConsole;

  beforeSend?: BeforeSendHook<P>;
  ignoreErrors?: Patterns;
  ignoreUrls?: Patterns;
  sessionTracking?: {
    enabled?: boolean;
    persistent?: boolean;
    session?: MetaSession;
    maxSessionPersistenceTime?: number;
    onSessionChange?: (oldSession: MetaSession | null, newSession: MetaSession) => void;
    samplingRate?: number;
    sampler?: (context: SamplingContext) => number;
    generateSessionId?: () => string;
  };

  user?: MetaUser;
  view?: MetaView;
  eventDomain?: string;

  trackResources?: boolean;
  trackWebVitalAttribution?: boolean;
}

export type Patterns = Array<string | RegExp>;
