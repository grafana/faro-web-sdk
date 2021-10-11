import type { BaseObject, BaseObjectKey } from './utils/baseObject';

export type MetaGetter = () => BaseObject;

export type MetaMap = Map<BaseObjectKey, MetaGetter>;

export type MetaValues = BaseObject;

export const meta: MetaMap = new Map();

export function initializeMeta() {
  meta.set('sdk', () => ({
    name: '@grafana/frontend-agent',
    version: '0.0.1', // TODO: set correct version here
  }));
}

export function getMetaValues(): MetaValues {
  return Object.fromEntries(Array.from(meta.entries()).map(([key, valueGetter]) => [key, valueGetter()]));
}
