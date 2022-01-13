import type { Meta, MetaMap } from './types';

export function initializeMeta(): Meta {
  const map: MetaMap = new Map();

  const add: Meta['add'] = (key, getter) => {
    if (!map.has(key)) {
      map.set(key, getter);
    }
  };

  const remove: Meta['remove'] = (key) => {
    map.delete(key);
  };

  add('sdk', () => ({
    name: '@grafana/frontend-agent',
    version: '0.0.1', // TODO: set correct version here
  }));

  return {
    add,
    map,
    remove,
    get values() {
      return Object.fromEntries(Array.from(map.entries()).map(([key, valueGetter]) => [key, valueGetter()]));
    },
  };
}
