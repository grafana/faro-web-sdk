export interface Instrumentation {
  readonly name: string;
  readonly version: string;

  initialize(): void;
  shutdown(): void
}
