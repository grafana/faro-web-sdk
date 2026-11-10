import type { Config } from '@grafana/faro-core';

export type FrustrationThresholds = Required<NonNullable<Config['frustrationInstrumentation']>>;

export const defaultFrustrationThresholds: FrustrationThresholds = {
  // Clicks further apart than this in time or space start a new burst
  burstMaxGapMs: 1000,
  burstMaxRadiusPx: 100,
  // Number of clicks inside burstMaxGapMs that makes a burst a rage click
  rageClickThreshold: 3,
  // Page activity that starts later than this after a click is not considered a response to it
  responseWindowMs: 100,
};

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
  // The user scrolled since the previous click of the burst, or right after this click
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

/**
 * Applies the configured thresholds over the defaults. Invalid values fall back to the default.
 */
export function resolveFrustrationThresholds(
  options: Config['frustrationInstrumentation'] = {},
  warn: (message: string) => void
): FrustrationThresholds {
  const thresholds = { ...defaultFrustrationThresholds };

  (Object.keys(thresholds) as Array<keyof FrustrationThresholds>).forEach((key) => {
    const value = options[key];
    if (value === undefined) {
      return;
    }

    if (isValidThreshold(key, value)) {
      thresholds[key] = value;
    } else {
      warn(`frustrationInstrumentation.${key} is invalid; using ${thresholds[key]}`);
    }
  });

  return thresholds;
}

function isValidThreshold(key: keyof FrustrationThresholds, value: number): boolean {
  if (key === 'rageClickThreshold') {
    return Number.isInteger(value) && value >= 2;
  }

  return Number.isFinite(value) && value > 0;
}

export function belongsToBurst(last: TrackedClick, next: TrackedClick, thresholds: FrustrationThresholds): boolean {
  const distance = Math.hypot(next.clientX - last.clientX, next.clientY - last.clientY);

  return (
    last.target === next.target &&
    distance <= thresholds.burstMaxRadiusPx &&
    next.time - last.time <= thresholds.burstMaxGapMs
  );
}

/**
 * Turns a finished burst of clicks into frustration signals.
 * A rage burst produces a single signal. Otherwise every click is judged on its own.
 */
export function detectFrustrationSignals(
  burst: TrackedClick[],
  thresholds: FrustrationThresholds
): FrustrationSignal[] {
  const first = burst[0];
  const last = burst[burst.length - 1];
  if (!first || !last) {
    return [];
  }

  if (isRageBurst(burst, thresholds)) {
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

export function isRageBurst(burst: TrackedClick[], thresholds: FrustrationThresholds): boolean {
  if (burst.some((click) => click.changedSelection || click.scrolled)) {
    return false;
  }

  return burst.some((click, index) => {
    const windowStart = burst[index - (thresholds.rageClickThreshold - 1)];
    return windowStart !== undefined && click.time - windowStart.time <= thresholds.burstMaxGapMs;
  });
}

export function isUnresponsive(click: TrackedClick): boolean {
  if (click.gotResponse) {
    return false;
  }

  // A label forwards clicks on itself and on its content to its control
  const target = click.target.closest('label')?.control ?? click.target;

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
