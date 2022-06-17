import { allLogLevels, LogLevel, VERSION, BaseInstrumentation } from '@grafana/agent-core';

export interface ConsoleInstrumentationOptions {
  disabledLevels?: LogLevel[];
}

export class ConsoleInstrumentation extends BaseInstrumentation {
  static defaultDisabledLevels: LogLevel[] = [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG];

  readonly version = VERSION;
  readonly name = '@grafana/agent-web:instrumentation-console';
  private originalMethods: Map<LogLevel, typeof console.info> = new Map()

  constructor(private options: ConsoleInstrumentationOptions = {}) {
    super();
  }

  initialize() {
    this.unpatch()
    allLogLevels
      .filter((level) => !(this.options.disabledLevels ?? ConsoleInstrumentation.defaultDisabledLevels).includes(level))
      .forEach((level) => {
        /* eslint-disable-next-line no-console */
        this.originalMethods.set(level, console[level]);
        /* eslint-disable-next-line no-console */
        console[level] = (...args) => {
          try {
            this.agent.api.pushLog(args, { level });
          } catch (err) {
          } finally {
            this.agent.api.callOriginalConsoleMethod(level, ...args);
          }
        };
      });
  }

  private unpatch(): void {
   this.originalMethods.forEach((fn, level) => {
    /* eslint-disable-next-line no-console */
    console[level] = fn;
   })
   this.originalMethods.clear()
  }

  shutdown(): void {
    this.unpatch()
  }
}
