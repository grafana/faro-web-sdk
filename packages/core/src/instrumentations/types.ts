import type { API } from '../api';
import type { Extension } from '../extensions';
import type { Transports } from '../transports';

export interface Instrumentation extends Extension {
  api: API;
  transports: Transports;

  initialize: VoidFunction;

  destroy?: VoidFunction;
}

export interface Instrumentations {
  add: (...instrumentations: Instrumentation[]) => void;
  instrumentations: Instrumentation[];
  remove: (...instrumentations: Instrumentation[]) => void;
}
