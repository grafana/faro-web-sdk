import type { Config, LogLevel } from '@grafana/faro-core';

export interface BrowserConfig extends Partial<Omit<Config, 'app' | 'parseStacktrace'>>, Pick<Config, 'app'> {
  url?: string;
  apiKey?: string;
}

export interface GetWebInstrumentationsOptions {
  captureConsole?: boolean;
  captureConsoleDisabledLevels?: LogLevel[];
  /**
   * The performance instrumentation is currently in preview phase so it has to be enabled manually.
   * Once preview phase is over, it is enabled by default.
   */
  performanceInstrumentation?: boolean;
}
