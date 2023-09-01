import type { Config, LogLevel } from '@grafana/faro-core';

export interface BrowserConfig extends Partial<Omit<Config, 'app' | 'parseStacktrace'>>, Pick<Config, 'app'> {
  url?: string;
  apiKey?: string;
}

export interface GetWebInstrumentationsOptions {
  captureConsole?: boolean;
  captureConsoleDisabledLevels?: LogLevel[];
}
