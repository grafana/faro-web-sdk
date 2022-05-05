import { BaseTransport, getTransportBody, LogLevel, prefixAgentMessage, TransportItem } from '@grafana/agent-core';

const debugMessage = prefixAgentMessage('Failed sending payload to the receiver');

export interface FetchTransportRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  headers?: Record<string, string>;
}

export interface FetchTransportOptions {
  url: string;
  debug?: boolean;
  requestOptions: FetchTransportRequestOptions;
}

export class FetchTransport extends BaseTransport {
  constructor(private options: FetchTransportOptions) {
    super();
  }

  async send(item: TransportItem) {
    try {
      const body = JSON.stringify(getTransportBody(item));

      const { url, debug, requestOptions } = this.options;

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
          this.agent.api.callOriginalConsoleMethod(LogLevel.DEBUG, debugMessage, JSON.parse(body));
        }
      });
    } catch (err) {}
  }
}
