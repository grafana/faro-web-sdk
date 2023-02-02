export interface AttributeValue {
  readonly stringValue?: string;
  readonly boolValue?: boolean;
  readonly intValue?: number;
  readonly doubleValue?: number;
  readonly arrayValue?: {
    readonly values: AttributeValue[];
  };
  readonly kvlistValue?: {
    readonly values: Attribute[];
  };
  readonly bytesValue?: Uint8Array;
}

export interface Attribute {
  readonly key: string;
  readonly value: AttributeValue;
}
