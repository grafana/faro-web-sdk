import { BaseInstrumentation, faro, type Subscription, userActionsMessageBus, VERSION } from '@grafana/faro-core';

import { getUserEventHandler } from './processUserActionEventHandler';

export class UserActionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-user-action';
  readonly version = VERSION;

  private _userActionSub?: Subscription;

  initialize(): void {
    const { processUserEvent, processUserActionStarted } = getUserEventHandler(faro);
    window.addEventListener('pointerdown', processUserEvent);
    window.addEventListener('keydown', (ev: KeyboardEvent) => {
      if ([' ', 'Enter'].includes(ev.key)) {
        processUserEvent(ev);
      }
    });

    this._userActionSub = userActionsMessageBus.subscribe(({ type, userAction }) => {
      if (type === 'user_action_start') {
        processUserActionStarted(userAction);
      }
    });
  }

  destroy() {
    this._userActionSub?.unsubscribe();
  }
}
