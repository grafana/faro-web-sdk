import type { APIEvent, ExceptionStackFrame } from '../api';
import type { Config, Patterns } from '../config';
import type { StacktraceParser } from '../config/types';
import type { Transport, TransportItem } from '../transports';

export class MockTransport implements Transport {
  items: Array<TransportItem<APIEvent>> = [];

  constructor(private ignoreURLs: Patterns = []) {}

  send(item: TransportItem<APIEvent>): void | Promise<void> {
    this.items.push(item);
  }

  getIgnoreUrls(): Patterns {
    return this.ignoreURLs;
  }
}

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
    ...overrides,
  };
}

export const mockStacktraceParser: StacktraceParser = (err) => {
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
