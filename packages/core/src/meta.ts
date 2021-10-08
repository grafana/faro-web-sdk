import { MetaMap } from './types';

export const meta: MetaMap = new Map();

meta.set('sdk', () => ({
  name: '@grafana/frontend-agent',
  version: '0.0.1', // TODO: set correct version here
}));

export function getMetaValues() {
  return Object.fromEntries(Array.from(meta.entries()).map(([key, valueGetter]) => [key, valueGetter()]));
}
