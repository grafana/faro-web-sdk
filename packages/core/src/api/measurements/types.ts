import type { TraceContext } from '../traces';

export type MeasurementContext = Record<string, string>;

export interface MeasurementEvent<V extends { [label: string]: number } = { [label: string]: number }> {
  type: string;
  values: V;

  timestamp: string;
  trace?: TraceContext;
  context?: MeasurementContext;
}

export interface PushMeasurementOptions {
  skipDedupe?: boolean;
  context?: MeasurementContext;
}

export interface MeasurementsAPI {
  pushMeasurement: (
    payload: Omit<MeasurementEvent, 'timestamp'> & Partial<Pick<MeasurementEvent, 'timestamp'>>,
    options?: PushMeasurementOptions
  ) => void;
}
