import type { APIEvent, ExtendedError, Stacktrace } from '../api';
import type { Instrumentation } from '../instrumentations';
import type { App, User, Session, MetaItem } from '../metas';
import type { BeforeSendHook, Transport } from '../transports';

export interface Config<P = APIEvent> {
  app: App;
  globalObjectKey: string;
  instrumentations: Instrumentation[];
  metas: MetaItem[];
  parseStacktrace: StacktraceParser;
  preventGlobalExposure: boolean;
  transports: Transport[];

  beforeSend?: BeforeSendHook<P>;
  enableDebug?: boolean;
  ignoreErrors?: Patterns;
  session?: Session;
  user?: User;
}

export type StacktraceParser = (err: ExtendedError) => Stacktrace;

export type Patterns = Array<string | RegExp>;
