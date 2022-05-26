import type { Instrumentation } from '../instrumentations';
import type { App, User, Session, MetaItem } from '../metas';
import type { Transport } from '../transports';

export interface Config {
  globalObjectKey: string;
  instrumentations: Instrumentation[];
  preventGlobalExposure: boolean;
  transports: Transport[];
  metas: MetaItem[];
  app: App;
  session?: Session;
  user?: User;
}
