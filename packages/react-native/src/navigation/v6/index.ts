import { BaseInstrumentation } from '@grafana/faro-core';
import type { ReactNavigationConfig } from '../types';

/**
 * React Navigation v6 instrumentation for Faro
 * Tracks navigation events and screen changes
 */
export class ReactNativeNavigationIntegration extends BaseInstrumentation {
  readonly name = '@grafana/faro-react-native-navigation';
  readonly version = '1.0.0';

  constructor(_config?: ReactNavigationConfig) {
    super();
    // config will be used when implementing navigation tracking
  }

  initialize(): void {
    // TODO: Implement navigation tracking
    this.logInfo('React Navigation integration initialized (placeholder)');
  }
}
