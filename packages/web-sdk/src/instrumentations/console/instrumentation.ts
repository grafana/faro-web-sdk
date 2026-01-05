import {
  BaseInstrumentation,
  defaultErrorArgsSerializer,
  defaultLogArgsSerializer,
  LogLevel,
  VERSION,
} from '@grafana/faro-core';
import type { LogArgsSerializer, Subscription } from '@grafana/faro-core';

import { monitorConsole } from '../_internal/monitors/consoleMonitor';
import { getDetailsFromConsoleErrorArgs } from '../errors/getErrorDetails';

export class ConsoleInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-console';
  readonly version = VERSION;

  static defaultDisabledLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG];
  static consoleErrorPrefix = 'console.error: ';

  private errorSerializer: LogArgsSerializer = defaultLogArgsSerializer;
  private subscription: Subscription | undefined;

  initialize() {
    const instrumentationOptions = this.config.consoleInstrumentation;

    const serializeErrors = instrumentationOptions?.serializeErrors || !!instrumentationOptions?.errorSerializer;
    this.errorSerializer = serializeErrors
      ? (instrumentationOptions?.errorSerializer ?? defaultErrorArgsSerializer)
      : defaultLogArgsSerializer;

    const disabledLevels = instrumentationOptions?.disabledLevels ?? ConsoleInstrumentation.defaultDisabledLevels;

    // Pass unpatchedConsole to the monitor (only first caller's value is used)
    const consoleMonitor = monitorConsole(this.unpatchedConsole);

    // Subscribe this Faro instance to console events
    this.subscription = consoleMonitor.subscribe(({ level, args }) => {
      // Skip if this level is disabled for this instance
      if (disabledLevels.includes(level)) {
        return;
      }

      try {
        if (level === LogLevel.ERROR && !instrumentationOptions?.consoleErrorAsLog) {
          const { value, type, stackFrames } = getDetailsFromConsoleErrorArgs(args, this.errorSerializer);

          if (value && !type && !stackFrames) {
            this.api.pushError(new Error(ConsoleInstrumentation.consoleErrorPrefix + value));
            return;
          }

          this.api.pushError(new Error(ConsoleInstrumentation.consoleErrorPrefix + value), { type, stackFrames });
        } else if (level === LogLevel.ERROR && instrumentationOptions?.consoleErrorAsLog) {
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
          this.api.pushLog(args, { level });
        }
      } catch (err) {
        this.logError(err);
      }
    });
  }

  // Clean up subscription when instrumentation is destroyed
  destroy() {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }
}
