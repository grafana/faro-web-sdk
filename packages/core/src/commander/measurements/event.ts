export interface Event<V extends { [label: string]: number } = { [label: string]: number }> {
  values: V;
  type: string;
}
