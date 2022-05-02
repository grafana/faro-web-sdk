import { agent, allLogLevels, LogLevel, VERSION } from '@grafana/agent-core';
import type { Instrumentation } from '@grafana/agent-core';

export interface ConsoleInstrumentationOptions {
  disabledLevels?: LogLevel[];
}

export class ConsoleInstrumentation implements Instrumentation {
  static defaultDisabledLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.LOG];

  constructor(private options: ConsoleInstrumentationOptions = {}) {}

  initialize() {
    allLogLevels
      .filter((level) => !(this.options.disabledLevels ?? ConsoleInstrumentation.defaultDisabledLevels).includes(level))
      .forEach((level) => {
        /* eslint-disable-next-line no-console */
        console[level] = (...args) => {
          try {
            agent.api.pushLog(args, level);
          } catch (err) {
          } finally {
            agent.api.callOriginalConsoleMethod(level, ...args);
          }
        };
      });
  }

  version = VERSION;
  name = '@grafana/agent-web:instrumentation-console';
}
