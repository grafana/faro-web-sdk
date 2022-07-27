import { defaultGlobalObjectKey, defaultInternalLoggerLevel } from '@grafana/agent-core';
import type { Config, Transport } from '@grafana/agent-core';

import { parseStacktrace } from '../instrumentations';
import { defaultMetas } from '../metas';
import { FetchTransport } from '../transports';
import { getWebInstrumentations } from './getWebInstrumentations';
import type { BrowserConfig } from './types';

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
    globalObjectKey: browserConfig.globalObjectKey || defaultGlobalObjectKey,
    instrumentations: browserConfig.instrumentations ?? getWebInstrumentations(),
    internalLoggerLevel: browserConfig.internalLoggerLevel ?? defaultInternalLoggerLevel,
    metas: browserConfig.metas ?? defaultMetas,
    parseStacktrace,
    paused: browserConfig.paused ?? false,
    preventGlobalExposure: browserConfig.preventGlobalExposure || false,
    transports,
    unpatchedConsole: browserConfig.unpatchedConsole ?? console,

    beforeSend: browserConfig.beforeSend,
    ignoreErrors: browserConfig.ignoreErrors,
    session: browserConfig.session,
    user: browserConfig.user,
  };
}
