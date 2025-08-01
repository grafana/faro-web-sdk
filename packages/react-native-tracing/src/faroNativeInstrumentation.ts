import { BaseInstrumentation, VERSION } from '@grafana/react-native-sdk';

import { setDependencies } from './dependencies';

const INSTRUMENTATION_NAME = '@grafana/native-instrumentation';

export class NativeInstrumentation extends BaseInstrumentation {
  readonly name = INSTRUMENTATION_NAME;
  readonly version = VERSION;

  initialize(): void {
    setDependencies(this.api);
  }
}
