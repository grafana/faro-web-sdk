// TODO(@lucasbento): fix this
/* eslint-disable import/no-unresolved */
// @ts-expect-error
import { NativeModules } from 'react-native';

import { BaseInstrumentation, VERSION } from '@grafana/faro-web-sdk';

import { setDependencies } from './dependencies';

const INSTRUMENTATION_NAME = '@grafana/native-instrumentation';

export class NativeInstrumentation extends BaseInstrumentation {
  readonly name = INSTRUMENTATION_NAME;
  readonly version = VERSION;

  initialize(): void {
    setDependencies(this.api);
  }
}
