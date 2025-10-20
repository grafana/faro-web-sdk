// packages/web-sdk/src/instrumentations/userActions/userActionController.ts
import { Observable, UserActionState } from '@grafana/faro-core';
import type { Subscription, UserActionInterface } from '@grafana/faro-core';
import { startTimeout } from './util';
import { monitorDomMutations } from './domMutationMonitor';
import { monitorHttpRequests } from './httpRequestMonitor';
import { monitorPerformanceEntries } from './performanceEntriesMonitor';
import { isRequestEndMessage, isRequestStartMessage } from './processUserActionEventHandler';
import type { HttpRequestMessagePayload } from './types';

const defaultFollowUpActionTimeRange = 100;
const defaultHaltTimeout = 10 * 1000;

export class UserActionController {
  private readonly http = monitorHttpRequests();
  private readonly dom = monitorDomMutations();
  private readonly perf = monitorPerformanceEntries();

  private allMonitorsSub?: Subscription;
  private stateSub?: Subscription;
  private followUpTid?: number;
  private haltTid?: number;

  private isValid = false;
  private runningRequests = new Map<string, HttpRequestMessagePayload>();

  constructor(private ua: UserActionInterface) {}

  attach(): void {
    // Subscribe to monitors while action is active/halting
    this.allMonitorsSub = new Observable()
      .merge(this.http, this.dom, this.perf)
      .takeWhile(() => [UserActionState.Started, UserActionState.Halted].includes(this.ua.getState()))
      .filter((msg) => {
        // If the user action is in halt state, we only keep listening to ended http requests
        if (
          this.ua.getState() === UserActionState.Halted &&
          !(isRequestEndMessage(msg) && this.runningRequests.has(msg.request.requestId))
        ) {
          return false;
        }

        return true;
      })
      .subscribe((msg) => {
        if (isRequestStartMessage(msg)) {
          // An action is on halt if it has pending items, like pending HTTP requests.
          // In this case we start a separate timeout to wait for the requests to finish
          // If in the halt state, we stop adding Faro signals to the action's buffer (see userActionLifecycleHandler.ts)
          // But we are still subscribed to
          this.runningRequests.set(msg.request.requestId, msg.request);
        }

        if (isRequestEndMessage(msg)) {
          this.runningRequests.delete(msg.request.requestId);

          if (this.ua.getState() === UserActionState.Halted && this.runningRequests.size === 0) {
            this.ua.end();
          }
        } else {
          this.scheduleFollowUp();
        }
      });

    // When UA ends or cancels, cleanup timers/subscriptions
    this.stateSub = (this.ua as unknown as Observable)
      .filter((s: UserActionState) => [UserActionState.Ended, UserActionState.Cancelled].includes(s))
      .first()
      .subscribe(() => this.cleanup());

    // initial follow-up window in case nothing else happens
    this.scheduleFollowUp();
  }

  private scheduleFollowUp() {
    this.clearTimer(this.followUpTid);
    this.followUpTid = setTimeout(() => {
      // If action just started and there's pending work, go to halted
      if (this.ua.getState() === UserActionState.Started && this.runningRequests.size > 0) {
        this.haltAction();
        return;
      }

      // If we saw any relevant activity in the window, finish as ended
      if (this.isValid) {
        this.endAction();
        return;
      }

      // Otherwise, no signals => cancel
      this.cancelAction();
    }, defaultFollowUpActionTimeRange) as any;
  }

  private haltAction() {
    if (this.ua.getState() !== UserActionState.Started) {
      return;
    }
    this.startHaltTimeout();
  }

  private startHaltTimeout() {
    this.clearTimer(this.haltTid);
    this.haltTid = startTimeout(this.haltTid, () => {
      // If still halted after timeout, end
      if (this.ua.getState() === UserActionState.Halted) {
        this.endAction();
      }
    }, defaultHaltTimeout) as any;
  }

  private endAction() {
    this.ua.end();
    this.cleanup();
  }

  private cancelAction() {
    this.ua.cancel();
    this.cleanup();
  }

  private cleanup() {
    this.clearTimer(this.followUpTid);
    this.clearTimer(this.haltTid);
    this.allMonitorsSub?.unsubscribe();
    this.stateSub?.unsubscribe();
    this.allMonitorsSub = undefined;
    this.stateSub = undefined;
    this.runningRequests.clear();
  }

  private clearTimer(id?: number) {
    if (id) {
      clearTimeout(id);
    }
  }
}
