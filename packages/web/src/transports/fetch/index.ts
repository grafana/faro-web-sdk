import { BaseTransport, getTransportBody, TransportItem, VERSION } from '@grafana/agent-core';

export interface FetchTransportRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  headers?: Record<string, string>;
}

export interface FetchTransportOptions {
  // url of the collector endpoint
  url: string;

  // will be added as `x-api-key` header
  apiKey?: string;
  requestOptions?: FetchTransportRequestOptions;
}

export class FetchTransport extends BaseTransport {
  readonly name = '@grafana/agent-web:transport-fetch';
  readonly version = VERSION;

  constructor(private options: FetchTransportOptions) {
    super();
  }

  async send(item: TransportItem): Promise<void> {
    try {
      const body = JSON.stringify(getTransportBody(item));

      const { url, requestOptions, apiKey } = this.options;

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
        this.logError('Failed sending payload to the receiver\n', JSON.parse(body));
      });
    } catch (err) {
      this.logError(err);
    }
  }

  override getIgnoreUrls(): Array<string | RegExp> {
    return [this.options.url];
  }
}
