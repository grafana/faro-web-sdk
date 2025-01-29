import {
  allLogLevels,
  BaseInstrumentation,
  defaultErrorArgsSerializer,
  LogArgsSerializer,
  LogLevel,
  VERSION,
} from '@grafana/faro-core';

import { getDetailsFromConsoleErrorArgs } from '../../utils/errors';

import type { ConsoleInstrumentationOptions } from './types';

export class ConsoleInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-console';
  readonly version = VERSION;

  static defaultDisabledLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG];
  private errorSerializer?: LogArgsSerializer;

  constructor(private options: ConsoleInstrumentationOptions = {}) {
    super();
  }

  initialize() {
    this.options = { ...this.options, ...this.config.consoleInstrumentation };
    this.errorSerializer = this.options?.errorSerializer ?? defaultErrorArgsSerializer;

    allLogLevels
      .filter(
        (level) => !(this.options?.disabledLevels ?? ConsoleInstrumentation.defaultDisabledLevels).includes(level)
      )
      .forEach((level) => {
        /* eslint-disable-next-line no-console */
        console[level] = (...args) => {
          try {
            if (level === LogLevel.ERROR && !this.options?.consoleErrorAsLog) {
              const { value, type, stackFrames } = getDetailsFromConsoleErrorArgs(args, this.errorSerializer);

              if (value && !type && !stackFrames) {
                this.api.pushError(new Error('console.error: ' + value));
                return;
              }

              this.api.pushError(new Error('console.error: ' + value), { type, stackFrames });
            } else if (level === LogLevel.ERROR && this.options?.consoleErrorAsLog) {
              const { value, type } = getDetailsFromConsoleErrorArgs(args, this.errorSerializer);

              this.api.pushLog(args, { level, context: { value: value ?? '', type: type ?? '' } });
            } else {
              this.api.pushLog(args, { level });
            }
          } catch (err) {
            this.logError(err);
          } finally {
            this.unpatchedConsole[level](...args);
          }
        };
      });
  }
}
