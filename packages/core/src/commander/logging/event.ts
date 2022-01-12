import type { Context } from './context';
import type { Levels } from './levels';

export interface Event {
  context: Context;
  level: Levels;
  message: string;
  timestamp: string;
}
