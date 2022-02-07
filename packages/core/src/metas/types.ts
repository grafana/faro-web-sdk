import type { BaseObject, BaseObjectKey } from '../utils';

export type MetaGetter = () => BaseObject;

export type MetasMap = Map<BaseObjectKey, MetaGetter>;

export type Meta = () => {
  [key: BaseObjectKey]: MetaGetter;
};

export type MetasValue = BaseObject;

export interface Metas {
  add: (key: string, getter: MetaGetter) => void;
  map: MetasMap;
  remove: (key: string) => void;
  value: MetasValue;
}
