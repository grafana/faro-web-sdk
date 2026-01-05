import { allLogLevels, LogLevel, Observable } from '@grafana/faro-core';

import { MESSAGE_TYPE_CONSOLE } from './const';
import type { ConsoleMessage } from './types';

let consoleObservable: Observable<ConsoleMessage> | undefined;
let isInstrumented = false;
let originalConsoleMethods: Partial<Record<LogLevel, (...args: unknown[]) => void>> = {};

export function monitorConsole(disabledLevels: LogLevel[] = []): Observable<ConsoleMessage> {
  if (!consoleObservable) {
    consoleObservable = new Observable<ConsoleMessage>();
  }

  if (!isInstrumented) {
    allLogLevels
      .filter((level) => !disabledLevels.includes(level))
      .forEach((level) => {
        // Save original console method
        /* eslint-disable-next-line no-console */
        originalConsoleMethods[level] = console[level];

        /* eslint-disable-next-line no-console */
        console[level] = (...args: unknown[]) => {
          // Notify all subscribers
          consoleObservable!.notify({
            type: MESSAGE_TYPE_CONSOLE,
            level,
            args,
          });

          // Call original console method
          originalConsoleMethods[level]?.apply(console, args);
        };
      });

    isInstrumented = true;
  }

  return consoleObservable;
}

// Test-only utility to reset state between tests
export function __resetConsoleMonitorForTests() {
  // Restore original console methods
  for (const level of allLogLevels) {
    if (originalConsoleMethods[level]) {
      /* eslint-disable-next-line no-console */
      console[level] = originalConsoleMethods[level] as typeof console.log;
    }
  }

  consoleObservable = undefined;
  isInstrumented = false;
  originalConsoleMethods = {};
}

