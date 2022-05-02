export interface MeasurementEvent<V extends { [label: string]: number } = { [label: string]: number }> {
  type: string;
  values: V;

  trace?: {
    trace_id: string;
    span_id: string;
  };
}

export interface PushMeasurementOptions {}

export interface MeasurementsAPI {
  pushMeasurement: (payload: MeasurementEvent, options?: PushMeasurementOptions) => void;
}
