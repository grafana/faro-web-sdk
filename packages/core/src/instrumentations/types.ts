import type { API } from '../api';
import type { Config } from '../config';
import type { Extension } from '../extensions';
import type { Transports } from '../transports';

export interface Instrumentation<T extends Config = Config> extends Extension<T> {
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
