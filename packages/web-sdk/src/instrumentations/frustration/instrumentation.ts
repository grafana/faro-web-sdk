import { BaseInstrumentation, monoNow, Observable, shouldIgnoreEvent, VERSION } from '@grafana/faro-core';
import type { Subscription } from '@grafana/faro-core';

import { monitorDomMutations } from '../_internal/monitors/domMutationMonitor';
import { monitorHttpRequests } from '../_internal/monitors/httpRequestMonitor';
import { monitorPerformanceEntries } from '../_internal/monitors/performanceEntriesMonitor';
import { isRequestEndMessage } from '../userActions/util';

import { belongsToBurst, BURST_MAX_GAP_MS, detectFrustrationSignals } from './clickBurst';
import type { FrustrationSignal, TrackedClick } from './clickBurst';

// Page activity that starts later than this after a click is not considered a response to it
export const RESPONSE_WINDOW_MS = 100;

const listenerOptions: AddEventListenerOptions = { capture: true, passive: true };

/**
 * Reports rage clicks, dead clicks and error clicks as events. Ordinary clicks are not reported.
 */
export class FrustrationInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-frustration';
  readonly version: string = VERSION;

  private responseSub?: Subscription;
  private pointerDown?: { time: number; selection: string };
  private lastResponseTime?: number;
  // Clicks that can still be credited with a page response
  private clicksAwaitingResponse: TrackedClick[] = [];
  private burst: TrackedClick[] = [];
  private burstTid?: number;
  private readonly flushTids = new Set<number>();

  private readonly onPointerDown = (): void => {
    this.pointerDown = { time: monoNow(), selection: getSelectionText() };
  };

  private readonly onClick = (event: MouseEvent): void => {
    const target = resolveClickTarget(event);
    if (!target) {
      return;
    }

    const now = monoNow();
    // Handlers that react on pointerdown, like many dropdowns, change the page before the click event fires
    const start = this.pointerDown?.time ?? now;
    const click: TrackedClick = {
      target,
      clientX: event.clientX,
      clientY: event.clientY,
      time: now,
      gotResponse: this.lastResponseTime !== undefined && this.lastResponseTime >= start,
      threwError: false,
      changedSelection: this.pointerDown !== undefined && getSelectionText() !== this.pointerDown.selection,
      scrolled: false,
    };
    this.pointerDown = undefined;

    const previous = this.burst[this.burst.length - 1];
    if (previous && !belongsToBurst(previous, click)) {
      // The previous burst's last click may still get its page response
      this.flushBurst(RESPONSE_WINDOW_MS);
    }

    this.burst.push(click);
    this.pruneClicksAwaitingResponse(now);
    this.clicksAwaitingResponse.push(click);

    window.clearTimeout(this.burstTid);
    this.burstTid = window.setTimeout(() => this.flushBurst(0), BURST_MAX_GAP_MS);
  };

  private readonly onPageResponse = (): void => {
    this.markResponse((click) => {
      click.gotResponse = true;
    });
  };

  private readonly onScroll = (): void => {
    this.markResponse((click) => {
      click.gotResponse = true;
      click.scrolled = true;
    });
  };

  private readonly onError = (event: ErrorEvent): void => {
    const error = event.error instanceof Error ? event.error : undefined;
    this.markError(error ? `${error.message} ${error.name} ${error.stack}` : event.message);
  };

  private readonly onUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const reason = event.reason;
    this.markError(reason instanceof Error ? `${reason.message} ${reason.name} ${reason.stack}` : String(reason));
  };

  initialize(): void {
    this.responseSub = new Observable()
      .merge(monitorDomMutations(), monitorHttpRequests(), monitorPerformanceEntries())
      .filter((msg) => !isRequestEndMessage(msg))
      .subscribe(this.onPageResponse);

    window.addEventListener('pointerdown', this.onPointerDown, listenerOptions);
    window.addEventListener('click', this.onClick, listenerOptions);
    window.addEventListener('input', this.onPageResponse, listenerOptions);
    window.addEventListener('scroll', this.onScroll, listenerOptions);
    window.addEventListener('error', this.onError);
    window.addEventListener('unhandledrejection', this.onUnhandledRejection);
  }

  destroy(): void {
    this.responseSub?.unsubscribe();

    window.removeEventListener('pointerdown', this.onPointerDown, listenerOptions);
    window.removeEventListener('click', this.onClick, listenerOptions);
    window.removeEventListener('input', this.onPageResponse, listenerOptions);
    window.removeEventListener('scroll', this.onScroll, listenerOptions);
    window.removeEventListener('error', this.onError);
    window.removeEventListener('unhandledrejection', this.onUnhandledRejection);

    window.clearTimeout(this.burstTid);
    this.flushTids.forEach((tid) => window.clearTimeout(tid));
    this.flushTids.clear();
    this.burst = [];
    this.clicksAwaitingResponse = [];
    this.pointerDown = undefined;
  }

  private markResponse(mark: (click: TrackedClick) => void): void {
    const now = monoNow();
    this.lastResponseTime = now;
    this.pruneClicksAwaitingResponse(now);
    this.clicksAwaitingResponse.forEach(mark);
  }

  private pruneClicksAwaitingResponse(now: number): void {
    this.clicksAwaitingResponse = this.clicksAwaitingResponse.filter((click) => now - click.time <= RESPONSE_WINDOW_MS);
  }

  private markError(message: string): void {
    const click = this.burst[this.burst.length - 1];
    if (click && !shouldIgnoreEvent(this.config.ignoreErrors ?? [], message)) {
      click.threwError = true;
    }
  }

  private flushBurst(delay: number): void {
    const clicks = this.burst;
    this.burst = [];
    window.clearTimeout(this.burstTid);

    const tid = window.setTimeout(() => {
      this.flushTids.delete(tid);
      detectFrustrationSignals(clicks).forEach((signal) => this.report(signal));
    }, delay);
    this.flushTids.add(tid);
  }

  private report({ type, click, clickCount }: FrustrationSignal): void {
    this.api.pushEvent(`faro.frustration.${type}`, {
      target: describeElement(click.target),
      clickCount: String(clickCount),
    });
  }
}

function resolveClickTarget(event: Event): Element | undefined {
  // Clicks inside an open shadow root are retargeted to the host element
  const target = event.composedPath?.()[0] ?? event.target;
  return target instanceof Element ? target : undefined;
}

function getSelectionText(): string {
  return window.getSelection?.()?.toString() ?? '';
}

function describeElement(element: Element): string {
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList, (className) => `.${className}`).join('');

  return `${element.tagName.toLowerCase()}${id}${classes}`;
}
