import type { Faro } from '../sdk';

export function registerInitialInstrumentations(faro: Faro): void {
  faro.instrumentations.add(...faro.config.instrumentations);
}
