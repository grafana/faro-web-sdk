export type BaseObjectKey = string | number;

export type BaseObjectPrimitiveValue = string | number | boolean | null | undefined;

export type BaseObjectValue = BaseObjectPrimitiveValue | BaseObject | BaseObjectPrimitiveValue[];

export interface BaseObject {
  [key: BaseObjectKey]: BaseObjectValue;
}
