import { allLogLevels, LogLevel, VERSION, BaseInstrumentation } from '@grafana/agent-core';

export interface ConsoleInstrumentationOptions {
  disabledLevels?: LogLevel[];
}

export class ConsoleInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/agent-web:instrumentation-console';
  readonly version = VERSION;

  static defaultDisabledLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG];

  constructor(private options: ConsoleInstrumentationOptions = {}) {
    super();
  }

  initialize() {
    this.logDebug('Initializing', this.options);

    allLogLevels
      .filter((level) => !(this.options.disabledLevels ?? ConsoleInstrumentation.defaultDisabledLevels).includes(level))
      .forEach((level) => {
        /* eslint-disable-next-line no-console */
        console[level] = (...args) => {
          try {
            this.agent.api.pushLog(args, { level });
          } catch (err) {
            this.logError(err);
          } finally {
            this.agent.api.callOriginalConsoleMethod(level, ...args);
          }
        };
      });
  }
}
