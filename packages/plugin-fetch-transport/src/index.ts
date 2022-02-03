import type { Plugin } from '@grafana/javascript-agent-core';
import { Agent, getMessage, getTransportBody, LogLevel } from '@grafana/javascript-agent-core';

// @ts-ignore
function sendAsBeacon(url: string, body: string): void {
  const blobBody = new Blob([body], { type: 'application/json; charset=UTF-8' });

  navigator.sendBeacon(url, blobBody);
}

const debugMessage = getMessage('Failed sending payload to the receiver');

function sendAsFetch(body: string, options: FetchTransportPluginOptions, agent: Agent): void {
  const { url, debug, requestOptions } = options;

  const { headers, ...restOfRequestOptions } = requestOptions ?? {};

  fetch(url, {
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
}

export interface FetchTransportPluginRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  headers?: Record<string, string>;
}

export interface FetchTransportPluginOptions {
  url: string;
  debug?: boolean;
  requestOptions: FetchTransportPluginRequestOptions;
}

export default function getPlugin(options: FetchTransportPluginOptions): Plugin {
  // TODO: add support for sendBeacon in receiver
  // const sender = !navigator.sendBeacon ? sendAsFetch : sendAsBeacon;
  const sender = sendAsFetch;

  return {
    name: '@grafana/javascript-agent-plugin-fetch-transport',
    transports: (agent) => {
      return [
        (item) => {
          try {
            const body = JSON.stringify(getTransportBody(item));

            sender(body, options, agent);
          } catch (err) {}
        },
      ];
    },
  };
}
