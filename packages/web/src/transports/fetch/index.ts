import { BaseTransport, getTransportBody, LogLevel, prefixAgentMessage, TransportItem } from '@grafana/agent-core';

const debugMessage = prefixAgentMessage('Failed sending payload to the receiver');

export interface FetchTransportRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  headers?: Record<string, string>;
}

export interface FetchTransportOptions {
  // url of the collector endpoint
  url: string;

  // will be added as `x-api-key` header
  apiKey?: string;
  debug?: boolean;
  requestOptions?: FetchTransportRequestOptions;
}

export class FetchTransport extends BaseTransport {
  constructor(private options: FetchTransportOptions) {
    super();
  }

  async send(item: TransportItem) {
    try {
      const body = JSON.stringify(getTransportBody(item));

      const { url, debug, requestOptions, apiKey } = this.options;

      const { headers, ...restOfRequestOptions } = requestOptions ?? {};

      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(headers ?? {}),
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
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

  override getIgnoreUrls(): Array<string | RegExp> {
    return [this.options.url];
  }
}
