import { type Config, defaultBatchingConfig } from '../config';
import { defaultInternalLoggerLevel } from '../internalLogger';

import { mockStacktraceParser } from './mockStacktraceParser';

export function mockConfig(overrides: Partial<Config> = {}): Config {
  return {
    app: {
      name: 'test',
      version: '1.0.0',
    },
    batching: {
      enabled: false,
    },
    dedupe: true,
    // Disable the one-time SDK init event in test setups by default so tests don't have to
    // account for it when asserting on transport items. Tests that exercise the init event
    // can re-enable it via overrides.
    disableSdkInitEvent: true,
    globalObjectKey: 'faro',
    internalLoggerLevel: defaultInternalLoggerLevel,
    instrumentations: [],
    isolate: true,
    metas: [],
    parseStacktrace: mockStacktraceParser,
    paused: false,
    preventGlobalExposure: true,
    transports: [],
    unpatchedConsole: console,
    sessionTracking: {
      ...defaultBatchingConfig,
    },
    ...overrides,
  };
}
