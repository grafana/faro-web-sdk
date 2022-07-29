import { BaseTransport, getTransportBody, VERSION, createPromiseBuffer, PromiseBuffer } from '@grafana/agent-core';
import type { TransportItem } from '@grafana/agent-core';

import type { FetchTransportOptions } from './types';

const DEFAULT_BUFFER_SIZE = 30;
const DEFAULT_CONCURRENCY = 5; // chrome supports 10 total, firefox 17

export class FetchTransport extends BaseTransport {
  readonly name = '@grafana/agent-web:transport-fetch';
  readonly version = VERSION;

  promiseBuffer: PromiseBuffer<Response | void>;

  constructor(private options: FetchTransportOptions) {
    super();
    this.promiseBuffer = createPromiseBuffer({
      size: options.bufferSize ?? DEFAULT_BUFFER_SIZE,
      concurrency: options.concurrency ?? DEFAULT_CONCURRENCY,
    });
  }

  async send(item: TransportItem): Promise<void> {
    try {
      await this.promiseBuffer.add(() => {
        const body = JSON.stringify(getTransportBody(item));

        const { url, requestOptions, apiKey } = this.options;

        const { headers, ...restOfRequestOptions } = requestOptions ?? {};

        return fetch(url, {
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
      });
    } catch (err) {
      this.logError(err);
    }
  }

  override getIgnoreUrls(): Array<string | RegExp> {
    return [this.options.url];
  }
}
