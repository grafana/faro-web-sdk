import {
  allLogLevels,
  BaseInstrumentation,
  LogLevel,
  VERSION,
} from '@grafana/faro-core';

import { getDetailsFromErrorArgs } from '../../utils';

import type { ConsoleInstrumentationOptions } from './types';

export class ConsoleInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-console';
  readonly version = VERSION;

  static defaultDisabledLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG];

  constructor(private options: ConsoleInstrumentationOptions = {}) {
    super();
  }

  initialize() {
    this.logDebug('Initializing\n', this.options);
    this.options = { ...this.options, ...this.config.consoleInstrumentation };

    allLogLevels
      .filter(
        (level) => !(this.options?.disabledLevels ?? ConsoleInstrumentation.defaultDisabledLevels).includes(level)
      )
      .forEach((level) => {
        /* eslint-disable-next-line no-console */
        console[level] = (...args) => {
          try {
            if (level === LogLevel.ERROR && !this.options?.consoleErrorAsLog) {
              const { value, type, stackFrames } = getDetailsFromErrorArgs(args);

              this.api.pushError(new Error('console.error: ' + value), { type, stackFrames });
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
