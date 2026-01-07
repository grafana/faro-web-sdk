import { Observable, UserActionState } from '@grafana/faro-core';
import type { Subscription, UserActionInternalInterface } from '@grafana/faro-core';

import { type HttpRequestMessage, type HttpRequestMessagePayload, monitorHttpRequests } from './httpRequestMonitor';

const defaultFollowUpActionTimeRange = 100; // 100ms after activity stops
const defaultHaltTimeout = 10 * 1000; // 10 seconds max wait for HTTP

function isRequestStartMessage(
  msg: HttpRequestMessage
): msg is { type: 'http_request_start'; request: HttpRequestMessagePayload } {
  return msg.type === 'http_request_start';
}

function isRequestEndMessage(
  msg: HttpRequestMessage
): msg is { type: 'http_request_end'; request: HttpRequestMessagePayload } {
  return msg.type === 'http_request_end';
}

function startTimeout(callback: () => void, timeout: number): number {
  return setTimeout(callback, timeout) as unknown as number;
}

/**
 * Controller for managing user action lifecycle in React Native
 *
 * Responsibilities:
 * - Monitor HTTP requests triggered by user actions
 * - Intelligently determine when a user action is complete
 * - Handle "halt" state for pending async operations
 * - Auto-end actions after timeout
 */
export class UserActionController {
  private readonly http = monitorHttpRequests();

  private allMonitorsSub?: Subscription;
  private followUpTid?: number;
  private haltTid?: number;

  private isValid = false;
  private runningRequests = new Map<string, HttpRequestMessagePayload>();
  private isHalted = false;

  constructor(private userAction: UserActionInternalInterface) {}

  /**
   * Attach the controller to start monitoring
   */
  attach(): void {
    // Subscribe to HTTP requests while action is active/halting
    this.allMonitorsSub = new Observable()
      .merge(this.http)
      .takeWhile(() => {
        const state = this.userAction.getState();
        return [UserActionState.Started, UserActionState.Halted].includes(state);
      })
      .filter((msg) => {
        // If the user action is in halt state, we only keep listening to ended http requests
        if (this.isHalted && !(isRequestEndMessage(msg) && this.runningRequests.has(msg.request.requestId))) {
          return false;
        }

        return true;
      })
      .subscribe((msg) => {
        if (isRequestStartMessage(msg)) {
          // Track started HTTP requests
          this.runningRequests.set(msg.request.requestId, msg.request);
        }

        if (isRequestEndMessage(msg)) {
          this.runningRequests.delete(msg.request.requestId);
        }

        if (!isRequestEndMessage(msg)) {
          if (!this.isValid) {
            this.isValid = true;
          }
        }

        // Clear any existing follow-up timeout
        this.clearFollowUpTimeout();

        // If we have pending HTTP requests, don't schedule follow-up yet
        if (this.runningRequests.size > 0) {
          // Enter halt state if we have pending requests
          if (this.userAction.getState() === UserActionState.Started) {
            this.halt();
          }
        } else {
          // No pending requests, schedule action end
          this.scheduleFollowUpAction();
        }
      });

    // Start initial follow-up timeout
    this.scheduleFollowUpAction();
  }

  /**
   * Put the action in halt state (waiting for async operations)
   */
  private halt(): void {
    if (this.userAction.getState() === UserActionState.Started && !this.isHalted) {
      this.userAction.halt();
      this.isHalted = true;

      // Start halt timeout - max time to wait for pending operations
      this.haltTid = startTimeout(() => {
        this.end();
      }, defaultHaltTimeout);
    }
  }

  /**
   * End the user action
   */
  private end(): void {
    this.clearFollowUpTimeout();
    this.clearHaltTimeout();

    if (this.isValid) {
      this.userAction.end();
    } else {
      // No activity detected, cancel the action
      this.userAction.cancel();
    }

    this.cleanup();
  }

  /**
   * Schedule the follow-up action to end the user action
   */
  private scheduleFollowUpAction(): void {
    this.clearFollowUpTimeout();

    this.followUpTid = startTimeout(() => {
      this.end();
    }, defaultFollowUpActionTimeRange);
  }

  /**
   * Clear the follow-up timeout
   */
  private clearFollowUpTimeout(): void {
    if (this.followUpTid !== undefined) {
      clearTimeout(this.followUpTid);
      this.followUpTid = undefined;
    }
  }

  /**
   * Clear the halt timeout
   */
  private clearHaltTimeout(): void {
    if (this.haltTid !== undefined) {
      clearTimeout(this.haltTid);
      this.haltTid = undefined;
    }
  }

  /**
   * Clean up subscriptions
   */
  private cleanup(): void {
    this.allMonitorsSub?.unsubscribe();
    this.allMonitorsSub = undefined;
  }
}
