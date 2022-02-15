import { agent, allLogLevels, LogLevel } from '@grafana/javascript-agent-core';
import type { Instrumentation } from '@grafana/javascript-agent-core';

export interface ConsoleInstrumentationOptions {
  disabledLevels?: LogLevel[];
}

export default function getConsoleInstrumentation({
  disabledLevels,
}: ConsoleInstrumentationOptions = {}): Instrumentation {
  const defaultDisabledLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.LOG];

  return () => {
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
  };
}
