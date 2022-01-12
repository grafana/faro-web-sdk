import type { Transport, TransportItem } from './transports';

const baseOptions: Partial<RequestInit> = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  keepalive: true,
};

export function getFetchTransport(url: string): Transport {
  return (item: TransportItem) => {
    try {
      const body = JSON.stringify({
        [item.type]: [item.payload],
        meta: item.meta,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, body);
      } else {
        fetch(url, {
          ...baseOptions,
          body,
        }).catch();
      }
    } catch (err) {}
  };
}
