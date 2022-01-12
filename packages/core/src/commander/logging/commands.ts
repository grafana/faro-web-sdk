import type { Context } from './context';
import type { Levels } from './levels';

export interface Commands {
  pushLog: (args: unknown[], level?: Levels, context?: Context) => void;
}
