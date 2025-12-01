import { BaseInstrumentation } from '@grafana/faro-core';

/**
 * Console instrumentation for React Native
 * Captures console logs
 */
export class ConsoleInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native-console';
  readonly version = '1.0.0';

  initialize(): void {
    // TODO: Implement console patching
    this.logInfo('Console instrumentation initialized (placeholder)');
  }
}
