import { BaseInstrumentation, faro, type Subscription, userActionsMessageBus, VERSION } from '@grafana/faro-core';

import { getUserEventHandler } from './processUserActionEventHandler';

export class UserActionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-user-action';
  readonly version = VERSION;

  private _userActionSub?: Subscription;
  private _abortController?: AbortController;

  initialize(): void {
    const { processUserEvent, processUserActionStarted } = getUserEventHandler(faro, (message) =>
      this.logWarn(message)
    );
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    window.addEventListener('pointerdown', processUserEvent, { signal });
    window.addEventListener(
      'keydown',
      (ev: KeyboardEvent) => {
        if ([' ', 'Enter'].includes(ev.key)) {
          processUserEvent(ev);
        }
      },
      { signal }
    );

    this._userActionSub = userActionsMessageBus.subscribe(({ type, userAction, initialActivityTimeout }) => {
      if (type === 'user_action_start') {
        processUserActionStarted(userAction, initialActivityTimeout);
      }
    });
  }

  destroy() {
    this._abortController?.abort();
    this._userActionSub?.unsubscribe();
  }
}
