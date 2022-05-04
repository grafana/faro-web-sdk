import { agent, allLogLevels, LogLevel, VERSION } from '@grafana/agent-core';
import type { Instrumentation } from '@grafana/agent-core';

export interface ConsoleInstrumentationOptions {
  disabledLevels?: LogLevel[];
}

export function getConsoleInstrumentation({ disabledLevels }: ConsoleInstrumentationOptions = {}): Instrumentation {
  const defaultDisabledLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.LOG];

  return {
    initialize: () => {
      allLogLevels
        .filter((level) => !(disabledLevels ?? defaultDisabledLevels).includes(level))
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
    },
    version: VERSION,
    name: '@grafana/agent-web:instrumentation-console',
  };
}
