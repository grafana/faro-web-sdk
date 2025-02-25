import type { Patterns } from '../config/types';
import { isString } from '../utils/is';

export function shouldIgnoreEvent(patterns: Patterns, msg: string): boolean {
  return patterns.some((pattern) => {
    return isString(pattern) ? msg.includes(pattern) : !!msg.match(pattern);
  });
}
