import {
  Instrumentation,
  MetaItem,
  App,
  Session,
  User,
  Config,
  defaultGlobalObjectKey,
  Transport,
} from '@grafana/agent-core';

import { ErrorsInstrumentation, WebVitalsInstrumentation } from './instrumentations';
import { browserMeta, pageMeta } from './metas';
import { FetchTransport } from './transports';

export interface BrowserConfig {
  url?: string;
  apiKey?: string;
  app: App;
  session?: Session;
  user?: User;
  globalObjectKey?: string;
  preventGlobalExposure?: boolean;
  metas?: MetaItem[];
  instrumentations?: Instrumentation[];
  transports?: Transport[];
}

export const defaultMetas: MetaItem[] = [browserMeta, pageMeta];

export const getDefaultInstrumentations = (): Instrumentation[] => [
  new ErrorsInstrumentation(),
  new WebVitalsInstrumentation(),
];

export function makeCoreConfig(browserConfig: BrowserConfig): Config {
  const transports: Transport[] = [];
  if (browserConfig.transports) {
    if (browserConfig.url || browserConfig.apiKey) {
      throw new Error('if "transports" is defined, "url" and "apiKey" should not be defined');
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
    throw new Error('either "url" or "transports" must be defined');
  }

  const config: Config = {
    globalObjectKey: browserConfig.globalObjectKey || defaultGlobalObjectKey,
    preventGlobalExposure: browserConfig.preventGlobalExposure || false,
    transports,
    metas: browserConfig.metas ?? defaultMetas,
    instrumentations: browserConfig.instrumentations ?? getDefaultInstrumentations(),
    app: browserConfig.app,
    session: browserConfig.session,
    user: browserConfig.user,
  };

  return config;
}
