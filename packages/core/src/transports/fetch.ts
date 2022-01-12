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
      fetch(url, {
        ...baseOptions,
        body: JSON.stringify({
          [item.type]: [item.payload],
          meta: item.meta,
        }),
      }).catch();
    } catch (err) {}
  };
}
