import { allLogLevels, BaseInstrumentation, defaultErrorArgsSerializer, LogLevel, VERSION } from '@grafana/faro-core';
import type { LogArgsSerializer } from '@grafana/faro-core';

import { getDetailsFromConsoleErrorArgs, reactNativeLogArgsSerializer } from './utils';

/**
 * Console instrumentation for React Native
 * Captures console logs and errors
 *
 * Features:
 * - Configurable log levels
 * - Advanced error serialization
 * - Option to treat console.error as log or error
 * - Unpatch support for cleanup
 */
export class ConsoleInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native:instrumentation-console';
  readonly version = VERSION;

  static defaultDisabledLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG];
  static consoleErrorPrefix = 'console.error: ';

  private originalConsole: Record<string, any> = {};
  private errorSerializer: LogArgsSerializer = reactNativeLogArgsSerializer;
  private patchedLevels: LogLevel[] = [];

  initialize(): void {
    const instrumentationOptions = this.config.consoleInstrumentation;

    // Configure error serialization
    const serializeErrors = instrumentationOptions?.serializeErrors || !!instrumentationOptions?.errorSerializer;
    this.errorSerializer = serializeErrors
      ? (instrumentationOptions?.errorSerializer ?? defaultErrorArgsSerializer)
      : reactNativeLogArgsSerializer;

    // Store original console methods
    allLogLevels.forEach((level) => {
      this.originalConsole[level] = console[level];
    });

    // Determine which levels to patch
    this.patchedLevels = allLogLevels.filter(
      (level) =>
        !(instrumentationOptions?.disabledLevels ?? ConsoleInstrumentation.defaultDisabledLevels).includes(level)
    );

    // Patch console methods
    this.patchedLevels.forEach((level) => {
      console[level] = (...args: any[]) => {
        try {
          if (level === LogLevel.ERROR && !instrumentationOptions?.consoleErrorAsLog) {
            // Handle console.error as an error with advanced serialization
            const { value, type, stackFrames } = getDetailsFromConsoleErrorArgs(args, this.errorSerializer);

            if (value && !type && !stackFrames) {
              // Simple error without stack frames
              this.api.pushError(new Error(ConsoleInstrumentation.consoleErrorPrefix + value));
            } else {
              // Error with type and/or stack frames
              this.api.pushError(new Error(ConsoleInstrumentation.consoleErrorPrefix + (value ?? '')), {
                type,
                stackFrames,
              });
            }
          } else if (level === LogLevel.ERROR && instrumentationOptions?.consoleErrorAsLog) {
            // Handle console.error as a log with error details in context
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
            // Handle other log levels normally
            this.api.pushLog(args, { level });
          }
        } catch (err) {
          // Use unpatchedConsole to avoid infinite loop
          this.unpatchedConsole.error('[Faro Console] Error capturing log:', err);
          this.logError(err);
        } finally {
          // Always call original console method
          this.originalConsole[level]?.(...args);
        }
      };
    });

    this.logInfo('Console instrumentation initialized', {
      patchedLevels: this.patchedLevels,
      serializeErrors,
      consoleErrorAsLog: instrumentationOptions?.consoleErrorAsLog ?? false,
    });
  }

  /**
   * Restore original console methods
   * Call this to clean up and unpatch the console
   */
  unpatch(): void {
    this.patchedLevels.forEach((level) => {
      if (this.originalConsole[level]) {
        console[level] = this.originalConsole[level];
      }
    });

    this.patchedLevels = [];
    this.logInfo('Console instrumentation unpatched');
  }
}
