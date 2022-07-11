import {
  BaseTransport,
  getTransportBody,
  LogLevel,
  prefixAgentMessage,
  TransportItem,
  VERSION,
} from '@grafana/agent-core';

export interface ConsoleTransportOptions {
  level?: LogLevel;
}

export class ConsoleTransport extends BaseTransport {
  readonly name = '@grafana/agent-web:transport-console';
  readonly version = VERSION;

  private message = prefixAgentMessage('New event');

  constructor(private options: ConsoleTransportOptions = {}) {
    super();
  }

  send(item: TransportItem) {
    return this.agent.api.callOriginalConsoleMethod(
      this.options.level ?? LogLevel.DEBUG,
      this.message,
      getTransportBody(item)
    );
  }
}
