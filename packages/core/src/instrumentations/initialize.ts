import type { Config } from '../config';

export function initializeInstrumentations(config: Config): void {
  config.instrumentations.forEach((instrumentation) => {
    instrumentation.initialize();
  });
}

export function shutdownInstrumentations(config: Config): void {
  config.instrumentations.forEach((instrumentation) => {
    instrumentation.shutdown();
  });
}
