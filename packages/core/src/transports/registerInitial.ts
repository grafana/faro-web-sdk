import type { Faro } from '../sdk';

export function registerInitialTransports(faro: Faro): void {
  faro.transports.add(...faro.config.transports);
  faro.transports.addBeforeSendHooks(faro.config.beforeSend);
  faro.transports.addIgnoreErrorsPatterns(faro.config.ignoreErrors);
}
