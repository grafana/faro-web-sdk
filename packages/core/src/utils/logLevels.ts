export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  LOG = 'log',
  WARN = 'warn',
  ERROR = 'error',
}

export const defaultLogLevel = LogLevel.LOG;

export const allLogLevels: Readonly<Array<Readonly<LogLevel>>> = [
  LogLevel.TRACE,
  LogLevel.DEBUG,
  LogLevel.INFO,
  LogLevel.LOG,
  LogLevel.WARN,
  LogLevel.ERROR,
] as const;
