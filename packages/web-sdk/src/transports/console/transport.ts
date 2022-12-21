import { BaseTransport, getTransportBody, LogLevel, VERSION } from '@grafana/faro-core';
import type { TransportItem } from '@grafana/faro-core';

import type { ConsoleTransportOptions } from './types';

export class ConsoleTransport extends BaseTransport {
  readonly name = '@grafana/faro-web-sdk:transport-console';
  readonly version = VERSION;

  constructor(private options: ConsoleTransportOptions = {}) {
    super();
  }

  send(item: TransportItem): void {
    return this.unpatchedConsole[this.options.level ?? LogLevel.DEBUG]('New event', getTransportBody(item));
  }
}
