import type { BaseObject, BaseObjectValue } from '../../utils';

export type KeyValueValue =
  | {
      arrayValue?: KeyValueValue[];
    }
  | {
      boolValue?: boolean;
    }
  | {
      doubleValue?: number;
    }
  | {
      intValue?: number;
    }
  | {
      kvlistValue?: {
        values: KeyValue[];
      };
    }
  | {
      stringValue?: string;
    };

export interface KeyValue {
  key: string;
  value: KeyValueValue;
}

export interface Resource {
  attributes: KeyValue[];
  droppedAttributesCount: number;
}

export interface InstrumentationLibrary {
  name: string;

  version?: string;
}

export interface InstrumentationLibrarySpanEvent {
  droppedAttributesCount: number;
  name: string;
  timeUnixNano: number;

  attributes?: KeyValue[];
}

export interface InstrumentationLibrarySpanLink {
  droppedAttributesCount: number;
  spanId: string;
  traceId: string;

  attributes?: KeyValue[];
  traceState?: string;
}

export interface InstrumentationLibrarySpan {
  droppedAttributesCount: number;
  droppedLinksCount: number;
  droppedEventsCount: number;
  spanId: string;
  traceId: string;
  traceState: string | undefined;

  attributes?: KeyValue[];
  endTimeUnixNano?: number;
  events?: InstrumentationLibrarySpanEvent[];
  kind?: SpanKind;
  links?: InstrumentationLibrarySpanLink[];
  name?: string;
  parentSpanId?: string;
  startTimeUnixNano?: number;
  status?: SpanStatus;
}

export interface ResourceSpan {
  instrumentationLibrary: InstrumentationLibrary;
  spans: InstrumentationLibrarySpan[];
}

export interface TraceEventSpan {
  resource: Resource;
  spans: ResourceSpan[];
}

export interface TraceEvent {
  resourceSpans: TraceEventSpan[];
}

export enum SpanKind {
  UNSPECIFIED = 0,
  INTERNAL = 1,
  SERVER = 2,
  CLIENT = 3,
  PRODUCER = 4,
  CONSUMER = 5,
}

export enum SpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

export interface SpanStatus {
  code: SpanStatusCode;

  message?: string;
}

export type SpanAttributeValue =
  | undefined
  | null
  | string
  | number
  | boolean
  | Array<null | undefined | string>
  | Array<null | undefined | number>
  | Array<null | undefined | boolean>;

export interface SpanAttributes {
  [key: string]: SpanAttributeValue;
}

export interface SpanGeneralAttributes extends SpanAttributes {
  'code.filepath'?: string;
  'code.function'?: string;
  'code.lineno'?: number;
  'code.namespace'?: string;
  'enduser.id'?: string;
  'enduser.role'?: string;
  'enduser.scope'?: string;
  'net.host.carrier.icc'?: string;
  'net.host.carrier.name'?: string;
  'net.host.carrier.mcc'?: string;
  'net.host.carrier.mnc'?: string;
  'net.host.connection.subtype'?:
    | 'cdma'
    | 'cdma2000_1xrtt'
    | 'edge'
    | 'evdo_0'
    | 'evdo_a'
    | 'evdo_b'
    | 'ehrpd'
    | 'gprs'
    | 'gsm'
    | 'hsdpa'
    | 'hspa'
    | 'hspap'
    | 'hsupa'
    | 'iden'
    | 'iwlan'
    | 'lte'
    | 'lte_ca'
    | 'nr'
    | 'nrnsa'
    | 'td_scdma'
    | 'umts'
    | string;
  'net.host.connection.type'?: 'cell' | 'unavailable' | 'unknown' | 'wired' | 'wifi' | string;
  'net.host.ip'?: string;
  'net.host.name'?: string;
  'net.host.port'?: number;
  'net.peer.ip'?: string;
  'net.peer.name'?: string;
  'net.peer.port'?: number;
  'net.transport'?: 'inproc' | 'ip_tcp' | 'ip_udp' | 'ip' | 'other' | 'pipe' | 'unix';
  'peer.service'?: string;
  'thread.id'?: string;
  'thread.name'?: string;
}

export type SpanHttpAttributes = SpanGeneralAttributes & {
  'http.method': string;

  'http.client_ip'?: string;
  'http.flavor'?: '1.0' | '1.1' | '2.0' | 'QUIC' | 'SPDY' | string;
  'http.host'?: string;
  'http.request_content_length'?: number;
  'http.request_content_length_uncompressed'?: number;
  'http.response_content_length'?: number;
  'http.response_content_length_uncompressed'?: number;
  'http.route'?: string;
  'http.scheme'?: string;
  'http.server_name'?: string;
  'http.status_code'?: number;
  'http.target'?: string;
  'http.url'?: string;
  'http.user_agent'?: string;
};

export interface SpanInstrumentationLibrary {
  name: string;

  version?: string;
}

export interface SpanEvent<A extends BaseObject = BaseObject> {
  attributes: A;
  date: number;
  name: string;
}

export interface SpanEvents {
  [name: string]: SpanEvent;
}

export interface SpanLink<A extends BaseObject = BaseObject> {
  attributes: A;
  spanId: string;
  traceId: string;
  traceState: string | undefined;
}

export interface SpanLinks {
  [traceId: string]: {
    [spanId: string]: SpanLink;
  };
}

export interface Span<A extends SpanAttributes = SpanGeneralAttributes> {
  addChildSpan: (span: Span) => void;
  addEvent: (eventName: string, eventDate?: number, eventAttributes?: BaseObject) => void;
  addLink: (
    linkTraceId: string,
    linkSpanId: string,
    linkTraceState?: string | undefined,
    linkAttributes?: BaseObject
  ) => void;
  getAsPayload: () => TraceEvent;
  getAttribute: <K extends keyof A>(key: K) => A[K];
  getAttributes: () => A;
  getChildSpan: (spanId: string) => Span | undefined;
  getChildSpans: () => Span[];
  getEndDate: () => number | undefined;
  getEvent: (eventName: string) => SpanEvent | undefined;
  getId: () => string;
  getKind: () => SpanKind;
  getLink: (traceId: string, spanId: string) => SpanLink | undefined;
  getName: () => string | undefined;
  getParentSpan: () => Span | undefined;
  getStartDate: () => number | undefined;
  getStatus: () => SpanStatus;
  getTraceId: () => string;
  getTraceState: () => string | undefined;
  isRootSpan: () => boolean;
  setAttribute: <K extends keyof A>(key: K, value: A[K]) => void;
  setEndDate: (newEndDate: number | undefined) => void;
  setEventAttribute: (eventName: string, attributeName: string, attributeValue: BaseObjectValue) => void;
  setKind: (newKind: SpanKind) => void;
  setLinkAttribute: (traceId: string, spanId: string, attributeName: string, attributeValue: BaseObjectValue) => void;
  setName: (newName: string | undefined) => void;
  setParentSpan: (newParentSpan: Span<SpanAttributes>) => void;
  setInstrumentationLibrary: (instrumentationLibraryName: string, instrumentationLibraryVersion?: string) => void;
  setStartDate: (newStartDate: number | undefined) => void;
  setStatus: (newStatusCode: SpanStatusCode, newStatusMessage?: string) => void;
  setTraceState: (newTraceState: string | undefined) => void;
  transport: () => void;
  unsetAttribute: <K extends keyof A>(key: K) => void;
  unsetAttributes: () => void;
  unsetEventAttribute: (eventName: string, attributeName: string) => void;
  unsetEventAttributes: (eventName: string) => void;
  unsetLinkAttribute: (traceId: string, spanId: string, attributeName: string) => void;
  unsetLinkAttributes: (traceId: string, spanId: string) => void;
}

export interface GetNewSpanOptions<A extends SpanAttributes = SpanGeneralAttributes> {
  instrumentationLibrary: SpanInstrumentationLibrary;

  attributes?: A;
  childSpans?: Span[];
  endDate?: number;
  events?: SpanEvents;
  kind?: SpanKind;
  links?: SpanLinks;
  name?: string;
  parentSpan?: Span;
  startDate?: number;
  status?: SpanStatus;
  traceState?: string;
}

export interface TracesAPI {
  getTraceId: () => string;
  getNewSpan: <A extends SpanAttributes = SpanGeneralAttributes>(options: GetNewSpanOptions<A>) => Span<A>;
  pushSpan: (payload: TraceEvent) => void;
}
