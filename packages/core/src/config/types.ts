import type { APIEvent, ExtendedError, Stacktrace } from '../api';
import type { Instrumentation } from '../instrumentations';
import type { App, User, Session, MetaItem } from '../metas';
import type { BeforeSendHook, Transport } from '../transports';

export interface Config<P = APIEvent> {
  globalObjectKey: string;
  instrumentations: Instrumentation[];
  preventGlobalExposure: boolean;
  transports: Transport[];
  metas: MetaItem[];
  app: App;
  parseStacktrace: StacktraceParser;

  paused?: boolean;
  session?: Session;
  user?: User;
  beforeSend?: BeforeSendHook<P>;
  ignoreErrors?: Patterns;
}

export type StacktraceParser = (err: ExtendedError) => Stacktrace;

export type Patterns = Array<string | RegExp>;
