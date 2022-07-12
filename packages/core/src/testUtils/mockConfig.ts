import type { Config } from '../config';
import { mockStacktraceParser } from './mockStacktraceParser';

export function mockConfig(overrides: Partial<Config> = {}): Config {
  return {
    globalObjectKey: 'grafanaAgent',
    instrumentations: [],
    preventGlobalExposure: true,
    transports: [],
    metas: [],
    app: {
      name: 'test',
      version: '1.0.0',
    },
    parseStacktrace: mockStacktraceParser,
    paused: false,
    ...overrides,
  };
}
