import {
  allLogLevels,
  BaseInstrumentation,
  defaultErrorArgsSerializer,
  defaultLogArgsSerializer,
  LogLevel,
  VERSION,
} from '@grafana/faro-core';
import type { LogArgsSerializer } from '@grafana/faro-core';

import { getDetailsFromConsoleErrorArgs } from '../errors/getErrorDetails';

import type { ConsoleInstrumentationOptions } from './types';

export class ConsoleInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-console';
  readonly version = VERSION;

  static defaultDisabledLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG];
  static consoleErrorPrefix = 'console.error: ';
  private errorSerializer: LogArgsSerializer = defaultLogArgsSerializer;

  constructor(private options: ConsoleInstrumentationOptions = {}) {
    super();
  }

  initialize() {
    this.options = { ...this.options, ...this.config.consoleInstrumentation };

    const serializeErrors = this.options?.serializeErrors || !!this.options?.errorSerializer;
    this.errorSerializer = serializeErrors
      ? (this.options?.errorSerializer ?? defaultErrorArgsSerializer)
      : defaultLogArgsSerializer;

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
                this.api.pushError(new Error(ConsoleInstrumentation.consoleErrorPrefix + value));
                return;
              }

              this.api.pushError(new Error(ConsoleInstrumentation.consoleErrorPrefix + value), { type, stackFrames });
            } else if (level === LogLevel.ERROR && this.options?.consoleErrorAsLog) {
              const { value, type, stackFrames } = getDetailsFromConsoleErrorArgs(args, this.errorSerializer);

              this.api.pushLog(value ? [ConsoleInstrumentation.consoleErrorPrefix + value] : args, {
                level,
                context: {
                  value: value ?? '',
                  type: type ?? '',
                  stackFrames: stackFrames?.length ? defaultErrorArgsSerializer(stackFrames) : '',
                },
              });
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
