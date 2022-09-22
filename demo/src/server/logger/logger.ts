import type { Logger } from 'winston';

export let logger: Logger;

export function setLogger(newLogger: Logger): void {
  logger = newLogger;
}
