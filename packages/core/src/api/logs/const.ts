import { LogLevel } from './types';

export const defaultLogLevel = LogLevel.LOG;

export const allLogLevels: LogLevel[] = [
  LogLevel.TRACE,
  LogLevel.DEBUG,
  LogLevel.INFO,
  LogLevel.LOG,
  LogLevel.WARN,
  LogLevel.ERROR,
];

export const originalConsoleMethods = allLogLevels.reduce((acc, level) => {
  /* eslint-disable-next-line no-console */
  acc[level] = console[level];

  return acc;
}, {} as { [level in LogLevel]: typeof console[level] });
