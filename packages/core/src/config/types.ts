import type { APIEvent, StacktraceParser } from '../api';
import type { Instrumentation } from '../instrumentations';
import type { InternalLoggerLevel } from '../internalLogger';
import type { MetaApp, MetaItem, MetaSession, MetaUser, MetaView } from '../metas';
import type { BatchExecutorOptions, BeforeSendHook, Transport } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';

export interface Config<P = APIEvent> {
  app: MetaApp;
  batching?: BatchExecutorOptions;
  dedupe: boolean;
  globalObjectKey: string;
  instrumentations: Instrumentation[];
  internalLoggerLevel: InternalLoggerLevel;
  isolate: boolean;
  metas: MetaItem[];
  parseStacktrace: StacktraceParser;
  paused: boolean;
  preventGlobalExposure: boolean;
  transports: Transport[];
  unpatchedConsole: UnpatchedConsole;

  beforeSend?: BeforeSendHook<P>;
  ignoreErrors?: Patterns;
  session?: MetaSession;
  sessionTracking?: {
    enabled?: boolean;
    persistent?: boolean;
    session?: MetaSession;
    maxSessionPersistenceTime?: number;
    onSessionChange?: (oldSession: MetaSession | null, newSession: MetaSession) => void;
  };

  user?: MetaUser;
  view?: MetaView;
  eventDomain?: string;
}

export type Patterns = Array<string | RegExp>;
