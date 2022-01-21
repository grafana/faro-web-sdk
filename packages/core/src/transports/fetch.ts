import type { Transport } from './types';
import { getTransportBody } from './utils';

// @ts-ignore
function sendAsBeacon(url: string, body: string): void {
  const blobBody = new Blob([body], { type: 'application/json; charset=UTF-8' });

  navigator.sendBeacon(url, blobBody);
}

function sendAsFetch(url: string, body: string, isDebugEnabled = false): void {
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
  }).catch(() => {
    if (isDebugEnabled) {
      // eslint-disable-next-line no-console
      console.debug('[GrafanaJavaScriptAgent] Failed sending payload to the receiver', JSON.parse(body));
    }
  }); // the empty callback is required as otherwise the catch will be ignored
}

export function getFetchTransport(url: string, isDebugEnabled = false): Transport {
  // TODO: add support for sendBeacon in receiver
  // const sender = !navigator.sendBeacon ? sendAsFetch : sendAsBeacon;
  const sender = sendAsFetch;

  return (item) => {
    try {
      const body = JSON.stringify(getTransportBody(item));

      sender(url, body, isDebugEnabled);
    } catch (err) {}
  };
}
