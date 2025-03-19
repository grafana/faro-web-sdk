import { BaseInstrumentation, faro, VERSION } from '@grafana/faro-core';

import { getUserEventHandler } from './processUserActionEventHandler';

export class UserActionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-user-action';
  readonly version = VERSION;

  initialize(): void {
    const processUserEventHandler = getUserEventHandler(faro);
    window.addEventListener('pointerdown', processUserEventHandler);
    window.addEventListener('keydown', processUserEventHandler);
  }
}
