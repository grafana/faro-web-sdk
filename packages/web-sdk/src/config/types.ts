import type { Config, LogLevel } from '@grafana/faro-core';
import type { ErrorInstrumentationOptions } from '../instrumentations/errors/types';

export interface BrowserConfig extends Partial<Omit<Config, 'app'>>, Pick<Config, 'app'> {
  url?: string;
  apiKey?: string;
}

export interface GetWebInstrumentationsOptions {
  captureConsole?: boolean;
  captureConsoleDisabledLevels?: LogLevel[];
  enablePerformanceInstrumentation?: boolean;
  errorInstrumentationOptions?: ErrorInstrumentationOptions;
}
