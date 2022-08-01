import type { LogLevel } from '@grafana/agent-core';

export interface ConsoleInstrumentationOptions {
  disabledLevels?: LogLevel[];
}
