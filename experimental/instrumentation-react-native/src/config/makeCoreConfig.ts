import {
  createInternalLogger,
  defaultBatchingConfig,
  defaultGlobalObjectKey,
  defaultInternalLoggerLevel,
  defaultUnpatchedConsole,
  genShortID,
} from '@grafana/faro-core';
import type { Config, ExceptionStackFrame, StacktraceParser, Transport } from '@grafana/faro-core';
import { faro, FetchTransport } from '@grafana/faro-web-sdk';

import { defaultEventDomain } from './consts';
import { getReactNativeInstrumentations } from './reactNativeInstrumentations';
import { registerMetas } from './registerMetas';
import type { ReactNativeConfig } from './types';

export function makeCoreConfig(browserConfig: ReactNativeConfig): Config | undefined {
  const transports: Transport[] = [];

  const internalLogger = createInternalLogger(browserConfig.unpatchedConsole, browserConfig.internalLoggerLevel);

  if (browserConfig.transports) {
    if (browserConfig.url || browserConfig.apiKey) {
      internalLogger.error('if "transports" is defined, "url" and "apiKey" should not be defined');
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
    internalLogger.error('either "url" or "transports" must be defined');
  }

  return {
    app: browserConfig.app,
    batching: {
      ...defaultBatchingConfig,
      ...browserConfig.batching,
    },
    dedupe: browserConfig.dedupe ?? true,
    globalObjectKey: browserConfig.globalObjectKey || defaultGlobalObjectKey,
    instrumentations: browserConfig.instrumentations ?? getReactNativeInstrumentations(),
    internalLoggerLevel: browserConfig.internalLoggerLevel ?? defaultInternalLoggerLevel,
    isolate: browserConfig.isolate ?? false,
    metas: registerMetas(faro) ?? browserConfig.metas, // TODO - for some reason SDK names not getting passed properly
    paused: browserConfig.paused ?? false,
    preventGlobalExposure: browserConfig.preventGlobalExposure ?? false,
    parseStacktrace: browserConfig.parseStacktrace ?? mockStacktraceParser,
    transports,
    unpatchedConsole: browserConfig.unpatchedConsole ?? defaultUnpatchedConsole,
    beforeSend: browserConfig.beforeSend,
    eventDomain: browserConfig.eventDomain ?? defaultEventDomain,
    ignoreErrors: browserConfig.ignoreErrors,
    session: browserConfig.session ?? createSession(),
    user: browserConfig.user,
    view: browserConfig?.view,
  };
}

const mockStacktraceParser: StacktraceParser = (err) => {
  const frames: ExceptionStackFrame[] = [];
  const stack = err.stack ?? err.stacktrace;

  if (stack) {
    stack.split('\n').forEach((line) => {
      frames.push({
        filename: line,
        function: '',
      });
    });
  }

  return {
    frames,
  };
};

const createSession = () => {
  return {
    id: genShortID()
  }
}
