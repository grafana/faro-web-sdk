import { resolve } from 'path';

export function toAbsolutePath(path: string): string {
  return resolve('./', path);
}
