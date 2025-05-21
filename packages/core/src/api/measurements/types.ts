import type { SpanContext } from '@opentelemetry/api';

import type { TraceContext } from '../traces';
import type { UserAction } from '../types';

export type MeasurementContext = Record<string, string>;

export interface MeasurementEvent<V extends { [label: string]: number } = { [label: string]: number }> {
  type: string;
  values: V;

  timestamp: string;
  trace?: TraceContext;
  context?: MeasurementContext;

  action?: UserAction;
}

export interface PushMeasurementOptions {
  skipDedupe?: boolean;
  context?: MeasurementContext;
  spanContext?: Pick<SpanContext, 'traceId' | 'spanId'>;
  timestampOverwriteMs?: number;
}

export interface MeasurementsAPI {
  pushMeasurement: (
    payload: Omit<MeasurementEvent, 'timestamp'> & Partial<Pick<MeasurementEvent, 'timestamp'>>,
    options?: PushMeasurementOptions
  ) => void;
}
