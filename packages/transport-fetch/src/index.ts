import { agent, getTransportBody, LogLevel, prefixAgentMessage } from '@grafana/javascript-agent-core';
import type { Transport } from '@grafana/javascript-agent-core';

const debugMessage = prefixAgentMessage('Failed sending payload to the receiver');

export interface FetchTransportRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  headers?: Record<string, string>;
}

export interface FetchTransportOptions {
  url: string;
  debug?: boolean;
  requestOptions: FetchTransportRequestOptions;
}

export default function getFetchTransport(options: FetchTransportOptions): Transport {
  return async (item) => {
    try {
      const body = JSON.stringify(getTransportBody(item));

      const { url, debug, requestOptions } = options;

      const { headers, ...restOfRequestOptions } = requestOptions ?? {};

      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(headers ?? {}),
        },
        body,
        keepalive: true,
        ...(restOfRequestOptions ?? {}),
      }).catch(() => {
        if (debug) {
          agent.api.callOriginalConsoleMethod(LogLevel.DEBUG, debugMessage, JSON.parse(body));
        }
      });
    } catch (err) {}
  };
}
