import type { Config } from '../config';

export function initializeInstrumentations(config: Config): void {
  config.instrumentations.forEach((instrumentation) => {
    instrumentation();
  });
}
