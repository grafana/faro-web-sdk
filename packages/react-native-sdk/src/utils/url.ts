import { faro } from '@grafana/faro-core';
import type { Transport } from '@grafana/faro-core';

/**
 * Get all configured ignore URLs.
 */
export function getIgnoreUrls() {
  return faro.transports.transports.flatMap((transport: Transport) => transport.getIgnoreUrls());
}
