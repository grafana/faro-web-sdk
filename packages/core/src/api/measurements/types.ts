import type { TraceContext } from '../traces';

export interface MeasurementEvent<V extends { [label: string]: number } = { [label: string]: number }> {
  type: string;
  values: V;

  timestamp: string;
  trace?: TraceContext;
}

export interface PushMeasurementOptions {
  skipDedupe?: boolean;
}

export interface MeasurementsAPI {
  pushMeasurement: (
    // TODO: change this back once we have aligned the measurement event types: See: https://github.com/grafana/faro-web-sdk/issues/110
    payload: Omit<MeasurementEvent, 'timestamp'> & Partial<Pick<MeasurementEvent, 'timestamp'>>,
    options?: PushMeasurementOptions
  ) => void;
}
