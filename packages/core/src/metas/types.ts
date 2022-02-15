import type { BaseObject, BaseObjectKey } from '../utils';

export type MetaGetter = () => BaseObject;

export type MetasMap = Map<BaseObjectKey, MetaGetter | BaseObject>;

export type Meta =
  | BaseObject
  | (() => {
      [key: BaseObjectKey]: MetaGetter | BaseObject;
    });

export type MetasValue = BaseObject;

export interface Metas {
  add: (key: string, getter: MetaGetter) => void;
  map: MetasMap;
  remove: (key: string) => void;
  value: MetasValue;
}
