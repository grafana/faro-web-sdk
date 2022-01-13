export interface MeasurementEvent<V extends { [label: string]: number } = { [label: string]: number }> {
  values: V;
  type: string;
}

export interface MeasurementsCommands {
  pushMeasurement: (payload: MeasurementEvent) => void;
}
