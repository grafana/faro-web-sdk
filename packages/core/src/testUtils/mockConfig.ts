import type { Config } from '../config';
import { defaultInternalLoggerLevel } from '../internalLogger';

import { mockStacktraceParser } from './mockStacktraceParser';

export function mockConfig(overrides: Partial<Config> = {}): Config {
  return {
    app: {
      name: 'test',
      version: '1.0.0',
    },
    dedupe: true,
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
    ...overrides,
  };
}
