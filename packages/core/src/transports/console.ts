import type { TransportItem } from './types';
import { getTransportBody } from './utils';

export function consoleTransport(item: TransportItem): void {
  // eslint-disable-next-line no-console
  console.debug(getTransportBody(item));
}
