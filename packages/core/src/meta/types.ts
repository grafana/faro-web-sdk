import type { BaseObject, BaseObjectKey } from '../utils';

export type MetaGetter = () => BaseObject;

export type MetaMap = Map<BaseObjectKey, MetaGetter>;

export interface MetaMapLike {
  [key: BaseObjectKey]: MetaGetter;
}

export type MetaValues = BaseObject;

export interface Meta {
  add: (key: string, getter: MetaGetter) => void;
  map: MetaMap;
  remove: (key: string) => void;
  values: MetaValues;
}
