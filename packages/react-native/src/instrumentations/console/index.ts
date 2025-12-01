import {
  allLogLevels,
  BaseInstrumentation,
  LogLevel,
  VERSION,
} from '@grafana/faro-core';

/**
 * Console instrumentation for React Native
 * Captures console logs
 */
export class ConsoleInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native:instrumentation-console';
  readonly version = VERSION;

  static defaultDisabledLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.TRACE];
  static consoleErrorPrefix = 'console.error: ';

  private originalConsole: Record<string, any> = {};

  initialize(): void {
    const instrumentationOptions = this.config.consoleInstrumentation;

    // Store original console methods
    allLogLevels.forEach((level) => {
      this.originalConsole[level] = console[level];
    });

    // Patch console methods
    allLogLevels
      .filter(
        (level) =>
          !(instrumentationOptions?.disabledLevels ?? ConsoleInstrumentation.defaultDisabledLevels).includes(level)
      )
      .forEach((level) => {
        console[level] = (...args: any[]) => {
          // Always call original console method first
          this.originalConsole[level]?.(...args);

          // Then try to send to Faro
          try {
            if (level === LogLevel.ERROR) {
              // Send errors as pushError
              const errorMessage = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
              ).join(' ');

              this.api.pushError(new Error(ConsoleInstrumentation.consoleErrorPrefix + errorMessage));
            } else {
              // Send other logs as pushLog
              this.api.pushLog(args, { level });
            }
          } catch (err) {
            // Use unpatchedConsole to avoid infinite loop
            this.unpatchedConsole.error('[Faro Console] Error capturing log:', err);
            this.logError(err);
          }
        };
      });

    this.logInfo('Console instrumentation initialized');
  }

}
