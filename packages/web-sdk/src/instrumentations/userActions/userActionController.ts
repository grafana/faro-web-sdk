// packages/web-sdk/src/instrumentations/userActions/userActionController.ts
import { Observable, UserActionState } from '@grafana/faro-core';
import type { Subscription, UserActionInterface } from '@grafana/faro-core';

import { monitorDomMutations } from './domMutationMonitor';
import { monitorHttpRequests } from './httpRequestMonitor';
import { monitorPerformanceEntries } from './performanceEntriesMonitor';
import { isRequestEndMessage, isRequestStartMessage } from './util';
import ActivityWindowTracker from '../../utils/eventsTracker';

const defaultFollowUpActionTimeRange = 100;
const defaultHaltTimeout = 10 * 1000;

export class UserActionController {
  private readonly http = monitorHttpRequests();
  private readonly dom = monitorDomMutations();
  private readonly perf = monitorPerformanceEntries();

  private stateSub?: Subscription;
  private tracker?: ActivityWindowTracker;
  private trackerSub?: Subscription;

  constructor(private ua: UserActionInterface) {}

  attach(): void {
    const merged = new Observable().merge(this.http, this.dom, this.perf);

    this.tracker = new ActivityWindowTracker(merged, {
      followUpMs: defaultFollowUpActionTimeRange,
      haltMs: defaultHaltTimeout,
      isBlockingStart: (msg) => (isRequestStartMessage(msg) ? msg.request.requestId : undefined),
      isBlockingEnd: (msg) => (isRequestEndMessage(msg) ? msg.request.requestId : undefined),
    });

    this.trackerSub = (this.tracker as unknown as Observable).subscribe((evt: any) => {
      if (evt?.message === 'tracking-ended') {
        const events: any[] = Array.isArray(evt.events) ? evt.events : [];
        const isValid = events.some((e) => !isRequestEndMessage(e));
        if (isValid) {
          this.endAction();
        } else {
          this.cancelAction();
        }
      }
    });

    // When UA ends or cancels, cleanup timers/subscriptions
    this.stateSub = (this.ua as unknown as Observable)
      .filter((s: UserActionState) => [UserActionState.Ended, UserActionState.Cancelled].includes(s))
      .first()
      .subscribe(() => this.cleanup());

    this.tracker.startTracking({ action: this.ua });
  }

  private endAction() {
    // console.trace();
    this.ua.end();
    this.cleanup();
  }

  private cancelAction() {
    this.ua.cancel();
    this.cleanup();
  }

  private cleanup() {
    this.trackerSub?.unsubscribe();
    this.stateSub?.unsubscribe();
    this.tracker = undefined;
    this.trackerSub = undefined;
    this.stateSub = undefined;
  }
}
