import { agent, getTransportBody, LogLevel, prefixAgentMessage } from '@grafana/agent-core';
import type { Transport } from '@grafana/agent-core';

export interface ConsoleTransportOptions {
  level?: LogLevel;
}

export function getConsoleTransport({ level }: ConsoleTransportOptions = {}): Transport {
  const message = prefixAgentMessage('New event');

  return async (item) => {
    agent.api.callOriginalConsoleMethod(level ?? LogLevel.DEBUG, message, getTransportBody(item));
  };
}
