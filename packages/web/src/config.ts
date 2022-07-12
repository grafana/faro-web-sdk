import { defaultGlobalObjectKey } from '@grafana/agent-core';
import type {
  BeforeSendHook,
  Config,
  Instrumentation,
  MetaApp,
  MetaItem,
  MetaSession,
  MetaUser,
  Patterns,
  Transport,
} from '@grafana/agent-core';

import {
  ConsoleInstrumentation,
  ErrorsInstrumentation,
  parseStacktrace,
  WebVitalsInstrumentation,
} from './instrumentations';
import { browserMeta, pageMeta } from './metas';
import { FetchTransport } from './transports';

export interface BrowserConfig {
  app: MetaApp;

  url?: string;
  apiKey?: string;
  session?: MetaSession;
  user?: MetaUser;
  globalObjectKey?: string;
  preventGlobalExposure?: boolean;
  metas?: MetaItem[];
  instrumentations?: Instrumentation[];
  transports?: Transport[];
  ignoreErrors?: Patterns;
  beforeSend?: BeforeSendHook;
  paused?: boolean;
}

export const defaultMetas: MetaItem[] = [browserMeta, pageMeta];

interface GetWebInstrumentationsOptions {
  captureConsole?: boolean;
}

export function getWebInstrumentations(options: GetWebInstrumentationsOptions = {}): Instrumentation[] {
  const instrumentations: Instrumentation[] = [new ErrorsInstrumentation(), new WebVitalsInstrumentation()];

  if (options.captureConsole !== false) {
    instrumentations.push(new ConsoleInstrumentation());
  }

  return instrumentations;
}

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

  return {
    globalObjectKey: browserConfig.globalObjectKey || defaultGlobalObjectKey,
    preventGlobalExposure: browserConfig.preventGlobalExposure || false,
    transports,
    metas: browserConfig.metas ?? defaultMetas,
    instrumentations: browserConfig.instrumentations ?? getWebInstrumentations(),
    app: browserConfig.app,
    session: browserConfig.session,
    user: browserConfig.user,
    ignoreErrors: browserConfig.ignoreErrors,
    parseStacktrace,
    paused: browserConfig.paused ?? false,
    beforeSend: browserConfig.beforeSend,
  };
}
