// OTLP wire types kept compatible with the payload accepted by pushTraces.
export interface IResourceSpans {
  resource?: Resource;
  scopeSpans: IScopeSpans[];
  schemaUrl?: string;
}

export interface IScopeSpans {
  scope?: IInstrumentationScope;
  spans?: ISpan[];
  schemaUrl?: string | null;
}

export interface ISpan {
  traceId: string | Uint8Array;
  spanId: string | Uint8Array;
  traceState?: string | null;
  parentSpanId?: string | Uint8Array;
  name: string;
  // Accept inferred numeric values, as the former enum fields did.
  kind: number;
  startTimeUnixNano: Fixed64;
  endTimeUnixNano: Fixed64;
  attributes: IKeyValue[];
  droppedAttributesCount: number;
  events: IEvent[];
  droppedEventsCount: number;
  links: ILink[];
  droppedLinksCount: number;
  status: IStatus;
  flags?: number;
}

export const ESpanKind = {
  SPAN_KIND_UNSPECIFIED: 0,
  SPAN_KIND_INTERNAL: 1,
  SPAN_KIND_SERVER: 2,
  SPAN_KIND_CLIENT: 3,
  SPAN_KIND_PRODUCER: 4,
  SPAN_KIND_CONSUMER: 5,
} as const;

export type ESpanKindType = (typeof ESpanKind)[keyof typeof ESpanKind];

export interface IStatus {
  message?: string;
  code: number;
}

export type EStatusCode = 0 | 1 | 2;

export interface IEvent {
  timeUnixNano: Fixed64;
  name: string;
  attributes: IKeyValue[];
  droppedAttributesCount: number;
}

export interface ILink {
  traceId: string | Uint8Array;
  spanId: string | Uint8Array;
  traceState?: string;
  attributes: IKeyValue[];
  droppedAttributesCount: number;
  flags?: number;
}

export interface Resource {
  attributes: IKeyValue[];
  droppedAttributesCount: number;
  schemaUrl?: string;
}

export interface IInstrumentationScope {
  name: string;
  version?: string;
  attributes?: IKeyValue[];
  droppedAttributesCount?: number;
}

export interface IKeyValue {
  key: string;
  value: IAnyValue;
}

export interface IAnyValue {
  stringValue?: string | null;
  boolValue?: boolean | null;
  intValue?: number | null;
  doubleValue?: number | null;
  arrayValue?: IArrayValue;
  kvlistValue?: IKeyValueList;
  bytesValue?: Uint8Array | string;
}

export interface IArrayValue {
  values: IAnyValue[];
}

export interface IKeyValueList {
  values: IKeyValue[];
}

export interface LongBits {
  low: number;
  high: number;
}

export type Fixed64 = LongBits | string | number;
