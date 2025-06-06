import { BaseInstrumentation, faro, VERSION } from '@grafana/faro-core';

import { userActionStartByApiCallEventName } from './const';
import { getUserEventHandler } from './processUserActionEventHandler';
import type { ApiEvent } from './types';

let processUserEventHandler: ReturnType<typeof getUserEventHandler> | undefined;

export class UserActionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-user-action';
  readonly version = VERSION;

  initialize(): void {
    processUserEventHandler = getUserEventHandler(faro);
    window.addEventListener('pointerdown', processUserEventHandler);
    window.addEventListener('keydown', processUserEventHandler);
  }
}

export function startUserAction(name: string, attributes?: Record<string, string>) {
  processUserEventHandler?.(createUserActionApiEvent(name, attributes));
}

function createUserActionApiEvent(name: string, attributes?: Record<string, string>): ApiEvent {
  return {
    name,
    attributes,
    type: userActionStartByApiCallEventName,
  };
}
