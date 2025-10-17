import { BaseInstrumentation, VERSION, faro, userActionsMessageBus, UserActionState, Observable } from '@grafana/faro-core';
import { monitorDomMutations } from '../userActions/domMutationMonitor';
import { monitorPerformanceEntries } from '../userActions/performanceEntriesMonitor';
import { getUserEventHandler } from '../userActions/processUserActionEventHandler';
import { monitorUrlChanges } from './urlChangeMonitor';

export class SoftNavigationInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-soft-navigation';
  readonly version = VERSION;

  initialize() {
    const { proceessUserActionStarted } = getUserEventHandler(faro);

    userActionsMessageBus.subscribe(({ type, userAction }) => {
      if (type !== 'user_action_start') {
        return;
      }

      // Ensure the normal user action lifecycle is attached (http/dom/perf, halt/extend)
      proceessUserActionStarted(userAction);

      const dom$ = monitorDomMutations();
      const perf$ = monitorPerformanceEntries();
      const url$ = monitorUrlChanges();

      let sawDomUpdate = false;
      let sawUrlChange = false;

      const domSub = dom$.subscribe(() => {
        sawDomUpdate = true;
      });

      // If desired, resource entries can be another signal; for now we don't toggle a flag
      const perfSub = perf$.subscribe(() => {});

      const urlSub = url$.subscribe(() => {
        sawUrlChange = true;
      });

      (userAction as any)
        .filter((s: UserActionState) => [UserActionState.Ended, UserActionState.Cancelled].includes(s))
        .first()
        .subscribe(() => {
          domSub.unsubscribe();
          perfSub.unsubscribe();
          urlSub.unsubscribe();

          if (sawDomUpdate && sawUrlChange && userAction.getState() === UserActionState.Ended) {
            faro.api.pushEvent('soft_navigation', {
              to: location.href,
              actionName: userAction.name,
            });
          }
        });
    });

    // Start an action for generic interactions if none is active, so soft-nav can still be detected.
    window.addEventListener('pointerdown', () => {
      if (!faro.api.getActiveUserAction()) {
        faro.api.startUserAction('soft-nav-user-action', {}, { triggerName: 'pointerdown', cancelTimeout: 100 });
      }
    });
    window.addEventListener('keydown', (ev: KeyboardEvent) => {
      if ([' ', 'Enter'].includes(ev.key) && !faro.api.getActiveUserAction()) {
        faro.api.startUserAction('soft-nav-user-action', {}, { triggerName: ev.key, cancelTimeout: 100 });
      }
    });
  }
}
