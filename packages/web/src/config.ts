import { defaultGlobalObjectKey } from '@grafana/agent-core';
import type { Config, Instrumentation, MetaItem, Transport } from '@grafana/agent-core';

import {
  ConsoleInstrumentation,
  ErrorsInstrumentation,
  parseStacktrace,
  WebVitalsInstrumentation,
} from './instrumentations';
import { browserMeta, pageMeta } from './metas';
import { FetchTransport } from './transports';

export interface BrowserConfig extends Partial<Omit<Config, 'app' | 'parseStacktrace'>>, Pick<Config, 'app'> {
  url?: string;
  apiKey?: string;
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
    app: browserConfig.app,
    beforeSend: browserConfig.beforeSend,
    globalObjectKey: browserConfig.globalObjectKey || defaultGlobalObjectKey,
    ignoreErrors: browserConfig.ignoreErrors,
    instrumentations: browserConfig.instrumentations ?? getWebInstrumentations(),
    internalLoggerLevel: browserConfig.internalLoggerLevel,
    metas: browserConfig.metas ?? defaultMetas,
    originalConsole: browserConfig.originalConsole,
    parseStacktrace,
    paused: browserConfig.paused ?? false,
    preventGlobalExposure: browserConfig.preventGlobalExposure || false,
    session: browserConfig.session,
    transports,
    user: browserConfig.user,
  };
}
