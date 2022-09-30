import { resolve } from 'node:path';

export function toAbsolutePath(path: string): string {
  return resolve('./', path);
}
