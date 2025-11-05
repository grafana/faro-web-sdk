// packages/web-sdk/src/instrumentations/userActions/userActionController.ts
import { Observable, UserActionState } from '@grafana/faro-core';
import type { Subscription, UserActionInternalInterface } from '@grafana/faro-core';

import { monitorDomMutations } from '../_internal/monitors/domMutationMonitor';
import { monitorHttpRequests } from '../_internal/monitors/httpRequestMonitor';
import { monitorPerformanceEntries } from '../_internal/monitors/performanceEntriesMonitor';
import type { HttpRequestMessagePayload } from '../_internal/monitors/types';

import { isRequestEndMessage, isRequestStartMessage, startTimeout } from './util';

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

  constructor(private userAction: UserActionInternalInterface) {}

  attach(): void {
    // Subscribe to monitors while action is active/halting
    this.allMonitorsSub = new Observable()
      .merge(this.http, this.dom, this.perf)
      .takeWhile(() => [UserActionState.Started, UserActionState.Halted].includes(this.userAction.getState()))
      .filter((msg) => {
        // If the user action is in halt state, we only keep listening to ended http requests
        if (
          this.userAction.getState() === UserActionState.Halted &&
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
        }

        if (!isRequestEndMessage(msg)) {
          if (!this.isValid) {
            this.isValid = true;
          }
          this.scheduleFollowUp();
        } else if (this.userAction.getState() === UserActionState.Halted && this.runningRequests.size === 0) {
          this.endAction();
        }
      });

    // When UA ends or cancels, cleanup timers/subscriptions
    this.stateSub = (this.userAction as unknown as Observable)
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
      if (this.userAction.getState() === UserActionState.Started && this.runningRequests.size > 0) {
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
    if (this.userAction.getState() !== UserActionState.Started) {
      return;
    }
    this.userAction.halt();
    this.startHaltTimeout();
  }

  private startHaltTimeout() {
    this.clearTimer(this.haltTid);
    this.haltTid = startTimeout(
      this.haltTid,
      () => {
        // If still halted after timeout, end
        if (this.userAction.getState() === UserActionState.Halted) {
          this.endAction();
        }
      },
      defaultHaltTimeout
    ) as any;
  }

  private endAction() {
    this.userAction.end();
    this.cleanup();
  }

  private cancelAction() {
    this.userAction.cancel();
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
