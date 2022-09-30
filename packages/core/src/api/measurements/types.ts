import type { TraceContext } from '../traces';

export interface MeasurementEvent<V extends { [label: string]: number } = { [label: string]: number }> {
  type: string;
  values: V;

  trace?: TraceContext;
}

export interface PushMeasurementOptions {
  skipDedupe?: boolean;
}

export interface MeasurementsAPI {
  pushMeasurement: (payload: MeasurementEvent, options?: PushMeasurementOptions) => void;
}
