import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';

export function initializeInstrumentations(_internalLogger: InternalLogger, config: Config): void {
  config.instrumentations.forEach((instrumentation) => {
    instrumentation.initialize();
  });
}
