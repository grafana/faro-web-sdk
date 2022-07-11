import type { ExceptionStackFrame } from '../api';
import type { Config, Patterns, StacktraceParser } from '../config';
import type { InternalLogger } from '../internalLogger';
import { BaseTransport } from '../transports';
import type { Transport, TransportItem } from '../transports';
import { VERSION } from '../version';
import { noop } from './noop';

export class MockTransport extends BaseTransport implements Transport {
  readonly name = '@grafana/transport-mock';
  readonly version = VERSION;

  items: TransportItem[] = [];

  constructor(private ignoreURLs: Patterns = []) {
    super();
  }

  send(item: TransportItem): void | Promise<void> {
    this.items.push(item);
  }

  override getIgnoreUrls(): Patterns {
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
    paused: false,
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

export const mockInternalLogger: InternalLogger = {
  prefix: 'Grafana JavaScript Agent',
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
};
