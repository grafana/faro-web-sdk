import type { API } from '../api';
import type { Extension } from '../extensions';
import type { Transports } from '../transports';

export interface Instrumentation extends Extension {
  api: API;
  transports: Transports;

  initialize: VoidFunction;

  destroy?: VoidFunction;

  /**
   * Optionally provide additional context to include in the one-time SDK init beacon.
   * For example, the React integration can surface the detected react-router version here.
   * Values are stringified before being sent.
   */
  getInitContext?: () => Record<string, unknown>;
}

export interface Instrumentations {
  add: (...instrumentations: Instrumentation[]) => void;
  instrumentations: Instrumentation[];
  remove: (...instrumentations: Instrumentation[]) => void;
}
