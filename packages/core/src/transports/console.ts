import type { TransportItem } from './transports';

export function consoleTransport(item: TransportItem): void {
  // eslint-disable-next-line no-console
  console.debug(item);
}
