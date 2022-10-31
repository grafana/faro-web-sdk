import type { InternalLogger } from '../internalLogger';
import { noop } from '../utils';

export const mockInternalLogger: InternalLogger = {
  prefix: 'Faro',
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
};
