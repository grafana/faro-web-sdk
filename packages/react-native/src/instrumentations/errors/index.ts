import { BaseInstrumentation } from '@grafana/faro-core';

/**
 * Errors instrumentation for React Native
 * Captures unhandled errors and promise rejections using ErrorUtils
 */
export class ErrorsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native-errors';
  readonly version = '1.0.0';

  initialize(): void {
    // TODO: Implement error capturing with ErrorUtils
    this.logInfo('Errors instrumentation initialized (placeholder)');
  }
}
