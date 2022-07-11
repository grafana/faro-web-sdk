export enum InternalLoggerLevel {
  OFF = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  VERBOSE = 4,
}

export const defaultInternalLoggerLevel = InternalLoggerLevel.ERROR;
