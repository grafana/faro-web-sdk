// Clicks further apart than this in time or space start a new burst
export const BURST_MAX_GAP_MS = 1000;
export const BURST_MAX_RADIUS_PX = 100;
// Number of clicks inside BURST_MAX_GAP_MS that makes a burst a rage click
export const RAGE_CLICK_THRESHOLD = 3;

export type TrackedClick = {
  target: Element;
  clientX: number;
  clientY: number;
  // Monotonic, for comparing clicks with each other
  time: number;
  // Wall clock, to place the click on the same timeline as a session replay
  timestamp: number;
  gotResponse: boolean;
  threwError: boolean;
  changedSelection: boolean;
  scrolled: boolean;
};

export type FrustrationSignal = {
  type: 'rage_click' | 'dead_click' | 'error_click';
  click: TrackedClick;
  clickCount: number;
  durationMs: number;
};

// Input types whose clicks toggle or submit something, so a missing page response is meaningful
const RESPONSIVE_INPUT_TYPES = ['button', 'checkbox', 'radio', 'range', 'reset', 'submit'];

export function belongsToBurst(last: TrackedClick, next: TrackedClick): boolean {
  const distance = Math.hypot(next.clientX - last.clientX, next.clientY - last.clientY);

  return last.target === next.target && distance <= BURST_MAX_RADIUS_PX && next.time - last.time <= BURST_MAX_GAP_MS;
}

/**
 * Turns a finished burst of clicks into frustration signals.
 * A rage burst produces a single signal. Otherwise every click is judged on its own.
 */
export function detectFrustrationSignals(burst: TrackedClick[]): FrustrationSignal[] {
  const first = burst[0];
  const last = burst[burst.length - 1];
  if (!first || !last) {
    return [];
  }

  if (isRageBurst(burst)) {
    return [{ type: 'rage_click', click: first, clickCount: burst.length, durationMs: last.time - first.time }];
  }

  // Double and triple clicks that select text are expected to leave the page untouched
  const selectsText = burst.some((click) => click.changedSelection);

  return burst.flatMap((click) => {
    const signals: FrustrationSignal[] = [];

    if (click.threwError) {
      signals.push({ type: 'error_click', click, clickCount: 1, durationMs: 0 });
    }

    if (!selectsText && isUnresponsive(click)) {
      signals.push({ type: 'dead_click', click, clickCount: 1, durationMs: 0 });
    }

    return signals;
  });
}

export function isRageBurst(burst: TrackedClick[]): boolean {
  if (burst.some((click) => click.changedSelection || click.scrolled)) {
    return false;
  }

  return burst.some((click, index) => {
    const windowStart = burst[index - (RAGE_CLICK_THRESHOLD - 1)];
    return windowStart !== undefined && click.time - windowStart.time <= BURST_MAX_GAP_MS;
  });
}

export function isUnresponsive(click: TrackedClick): boolean {
  if (click.gotResponse || click.scrolled) {
    return false;
  }

  // A label forwards the click to its control
  const target = click.target instanceof HTMLLabelElement ? (click.target.control ?? click.target) : click.target;

  return !reactsWithoutPageChange(target);
}

// Focusing a text field, opening a native dropdown, drawing on a canvas or following a link into a new tab
// are all valid reactions to a click that do not show up as page activity.
function reactsWithoutPageChange(element: Element): boolean {
  if (element.closest('a[href], [contenteditable]')) {
    return true;
  }

  if (element instanceof HTMLInputElement) {
    return !RESPONSIVE_INPUT_TYPES.includes(element.type);
  }

  return (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLCanvasElement
  );
}
