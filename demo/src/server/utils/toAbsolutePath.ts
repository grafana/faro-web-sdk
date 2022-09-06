import { resolve } from 'path';

const __dirname = process.cwd();

export function toAbsolutePath(path: string): string {
  return resolve(__dirname, path);
}
