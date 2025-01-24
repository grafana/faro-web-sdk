import { allLogLevels, BaseInstrumentation, defaultLogArgsSerializer, LogArgsSerializer, LogLevel, VERSION } from '@grafana/faro-core';

import type { ConsoleInstrumentationOptions } from './types';

export class ConsoleInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-console';
  readonly version = VERSION;

  static defaultDisabledLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG];
  private errorSerializer: LogArgsSerializer;

  constructor(private options: ConsoleInstrumentationOptions = {}) {
    super();

    this.errorSerializer = options.errorSerializer ?? defaultLogArgsSerializer;
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
              this.api.pushError(new Error('console.error: ' + this.errorSerializer(args)));
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
