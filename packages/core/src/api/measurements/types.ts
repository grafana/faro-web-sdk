export interface MeasurementEvent<V extends { [label: string]: number } = { [label: string]: number }> {
  values: V;
  type: string;
}

export interface MeasurementsAPI {
  pushMeasurement: (payload: MeasurementEvent) => void;
}
