import type { InternalLogger } from '../internalLogger';
import { noop } from '../utils';

export const mockInternalLogger: InternalLogger = {
  prefix: 'Grafana JavaScript Agent',
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
};
