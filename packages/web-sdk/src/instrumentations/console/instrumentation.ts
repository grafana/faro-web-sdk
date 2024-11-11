import { allLogLevels, BaseInstrumentation, isArray, isObject, LogLevel, VERSION } from '@grafana/faro-core';

import { stringifyExternalJson } from '../../utils';

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
            console.log('this.options?.consoleErrorAsLog :>> ', this.options?.consoleErrorAsLog);

            if (level === LogLevel.ERROR && !this.options?.consoleErrorAsLog) {
              this.api.pushError(
                new Error(
                  'console.error: ' +
                    args.map((arg) => (isObject(arg) || isArray(arg) ? stringifyExternalJson(arg) : arg)).join(' ')
                )
              );
            } else {
              this.api.pushLog(
                [args.map((arg) => (isObject(arg) || isArray(arg) ? JSON.stringify(arg) : arg)).join(' ')],
                { level }
              );
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
