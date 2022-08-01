import type { Extension } from '../utils';

export interface Instrumentation extends Extension {
  initialize(): void;
}
