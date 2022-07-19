import { BaseTransport, getTransportBody, LogLevel, TransportItem, VERSION } from '@grafana/agent-core';

export interface ConsoleTransportOptions {
  level?: LogLevel;
}

export class ConsoleTransport extends BaseTransport {
  readonly name = '@grafana/agent-web:transport-console';
  readonly version = VERSION;

  constructor(private options: ConsoleTransportOptions = {}) {
    super();
  }

  send(item: TransportItem): void {
    return this.agent.originalConsole.debug(this.options.level ?? LogLevel.DEBUG, 'New event', getTransportBody(item));
  }
}
