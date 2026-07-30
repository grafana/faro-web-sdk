import { BaseInstrumentation, faro, type Subscription, userActionsMessageBus, VERSION } from '@grafana/faro-core';

import { getUserEventHandler } from './processUserActionEventHandler';

export class UserActionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-user-action';
  readonly version = VERSION;

  private _userActionSub?: Subscription;
  private _processUserEvent?: (event: PointerEvent | KeyboardEvent) => void;
  private _processKeydown?: (event: KeyboardEvent) => void;

  initialize(): void {
    const { processUserEvent, processUserActionStarted } = getUserEventHandler(faro, (message) =>
      this.logWarn(message)
    );
    this._processUserEvent = processUserEvent;
    this._processKeydown = (event: KeyboardEvent) => {
      if ([' ', 'Enter'].includes(event.key)) {
        processUserEvent(event);
      }
    };
    window.addEventListener('pointerdown', this._processUserEvent);
    window.addEventListener('keydown', this._processKeydown);

    this._userActionSub = userActionsMessageBus.subscribe(({ type, userAction, initialActivityTimeout }) => {
      if (type === 'user_action_start') {
        processUserActionStarted(userAction, initialActivityTimeout);
      }
    });
  }

  destroy() {
    if (this._processUserEvent) {
      window.removeEventListener('pointerdown', this._processUserEvent);
    }
    if (this._processKeydown) {
      window.removeEventListener('keydown', this._processKeydown);
    }
    this._userActionSub?.unsubscribe();
  }
}
