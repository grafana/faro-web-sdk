import { allLogLevels, defaultUnpatchedConsole, Observable } from '@grafana/faro-core';
import type { UnpatchedConsole } from '@grafana/faro-core';

import { MESSAGE_TYPE_CONSOLE } from './const';
import type { ConsoleMessage } from './types';

let consoleObservable: Observable<ConsoleMessage> | undefined;
let isInstrumented = false;

/**
 * Monitors console methods and emits events to subscribers.
 * @param unpatchedConsole - Optional console to call after notifying subscribers.
 *                           Only the first caller's value is used (since we patch once).
 *                           Defaults to defaultUnpatchedConsole.
 */
export function monitorConsole(unpatchedConsole?: UnpatchedConsole): Observable<ConsoleMessage> {
  if (!consoleObservable) {
    consoleObservable = new Observable<ConsoleMessage>();
  }

  if (!isInstrumented) {
    const originalConsole = unpatchedConsole ?? defaultUnpatchedConsole;

    // Patch ALL console methods - subscribers decide which levels to process
    allLogLevels.forEach((level) => {
      console[level] = (...args: unknown[]) => {
        // Notify all subscribers
        consoleObservable!.notify({
          type: MESSAGE_TYPE_CONSOLE,
          level,
          args,
        });

        // Call the unpatchedConsole method
        originalConsole[level]?.apply(console, args);
      };
    });

    isInstrumented = true;
  }

  return consoleObservable;
}

// Test-only utility to reset state between tests
export function __resetConsoleMonitorForTests() {
  // Restore original console methods from defaultUnpatchedConsole
  for (const level of allLogLevels) {
    if (defaultUnpatchedConsole[level]) {
      console[level] = defaultUnpatchedConsole[level] as typeof console.log;
    }
  }

  consoleObservable = undefined;
  isInstrumented = false;
}
