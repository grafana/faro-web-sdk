import { agent, getTransportBody, LogLevel, prefixAgentMessage, TransportItem } from '@grafana/agent-core';
import type { Transport } from '@grafana/agent-core';

export interface ConsoleTransportOptions {
  level?: LogLevel;
}

export class ConsoleTransport implements Transport {
  private message = prefixAgentMessage('New event');

  constructor(private options: ConsoleTransportOptions = {}) {}

  send(item: TransportItem) {
    return agent.api.callOriginalConsoleMethod(
      this.options.level ?? LogLevel.DEBUG,
      this.message,
      getTransportBody(item)
    );
  }
}
