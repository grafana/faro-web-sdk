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
            this.unpatchedConsole.log(`[Faro Console] Captured ${level}:`, args);

            if (level === LogLevel.ERROR) {
              // Send errors as pushError
              const errorMessage = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
              ).join(' ');

              this.unpatchedConsole.log('[Faro Console] Pushing error:', errorMessage);
              this.api.pushError(new Error(ConsoleInstrumentation.consoleErrorPrefix + errorMessage));
            } else {
              // Send other logs as pushLog
              this.unpatchedConsole.log('[Faro Console] Pushing log:', args, 'level:', level);
              this.api.pushLog(args, { level });
            }
            this.unpatchedConsole.log('[Faro Console] Successfully sent to API');
          } catch (err) {
            // Use unpatchedConsole to avoid infinite loop
            this.unpatchedConsole.error('[Faro Console] Error capturing log:', err);
            this.logError(err);
          }
        };
      });

    this.unpatchedConsole.log('[Faro Console] Console instrumentation initialized');
    this.logInfo('Console instrumentation initialized');
  }

}
