export type BaseObjectKey = string | number;

export type BaseObjectValue = string | number | boolean | null | undefined | BaseObject | BaseObjectValue[];

export interface BaseObject {
  [key: BaseObjectKey]: BaseObjectValue;
}
