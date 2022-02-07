import { agent, getTransportBody, LogLevel, prefixAgentMessage } from '@grafana/javascript-agent-core';
import type { Transport } from '@grafana/javascript-agent-core';

export interface ConsoleTransportOptions {
  level?: LogLevel;
}

export default function getConsoleTransport({ level }: ConsoleTransportOptions = {}): Transport {
  const message = prefixAgentMessage('New event');

  return async (item) => {
    agent.api.callOriginalConsoleMethod(level ?? LogLevel.DEBUG, message, getTransportBody(item));
  };
}
