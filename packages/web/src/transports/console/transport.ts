import { BaseTransport, getTransportBody, LogLevel, VERSION } from '@grafana/agent-core';
import type { TransportItem } from '@grafana/agent-core';

import type { ConsoleTransportOptions } from './types';

export class ConsoleTransport extends BaseTransport {
  readonly name = '@grafana/agent-web:transport-console';
  readonly version = VERSION;

  constructor(private options: ConsoleTransportOptions = {}) {
    super();
  }

  send(item: TransportItem): void {
    return this.agent.unpatchedConsole[this.options.level ?? LogLevel.DEBUG]('New event', getTransportBody(item));
  }
}
