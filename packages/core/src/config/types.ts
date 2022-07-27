import type { APIEvent, ExtendedError, Stacktrace } from '../api';
import type { Instrumentation } from '../instrumentations';
import type { InternalLoggerLevel } from '../internalLogger';
import type { MetaApp, MetaItem, MetaSession, MetaUser } from '../metas';
import type { BeforeSendHook, Transport } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';

export interface Config<P = APIEvent> {
  app: MetaApp;
  globalObjectKey: string;
  instrumentations: Instrumentation[];
  internalLoggerLevel: InternalLoggerLevel;
  metas: MetaItem[];
  parseStacktrace: StacktraceParser;
  paused: boolean;
  preventGlobalExposure: boolean;
  transports: Transport[];
  unpatchedConsole: UnpatchedConsole;

  beforeSend?: BeforeSendHook<P>;
  ignoreErrors?: Patterns;
  session?: MetaSession;
  user?: MetaUser;
}

export type StacktraceParser = (err: ExtendedError) => Stacktrace;

export type Patterns = Array<string | RegExp>;
