import type { Extension } from '../utils';

export interface Instrumentation extends Extension {
  initialize: VoidFunction;

  destroy?: VoidFunction;
}

export interface Instrumentations {
  add: (...instrumentations: Instrumentation[]) => void;
  instrumentations: Instrumentation[];
  remove: (...instrumentations: Instrumentation[]) => void;
}
