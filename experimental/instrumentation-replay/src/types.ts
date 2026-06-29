import type { eventWithTime } from '@grafana/rrweb-types';

export interface ReplayInstrumentationOptions {
  /**
   * Whether to mask all inputs
   * @default true
   */
  maskAllInputs?: boolean;

  /**
   * Per-input-type masking configuration (e.g. text, email, tel, textarea, select).
   * Only applied when `maskAllInputs` is false.
   * @default { password: true }
   */
  maskInputOptions?: MaskInputOptions;

  /**
   * Custom function to transform input values before they are recorded.
   */
  maskInputFn?: MaskInputFn;

  /**
   * Custom CSS selector to mask text elements
   * @default '*'
   */
  maskTextSelector?: string;

  /**
   * Custom CSS selector to block elements
   * @default undefined
   */
  blockSelector?: string;

  /**
   * Custom CSS selector to ignore elements
   * @default undefined
   */
  ignoreSelector?: string;

  /**
   * Whether to collect fonts
   * @default false
   */
  collectFonts?: boolean;

  /**
   * Whether to inline images
   * @default false
   */
  inlineImages?: boolean;

  /**
   * Whether to inline stylesheets
   * @default false
   */
  inlineStylesheet?: boolean;

  /**
   * Whether to record canvas
   * @default false
   */
  recordCanvas?: boolean;

  /**
   * Whether to record cross-origin iframes
   * @default false
   */
  recordCrossOriginIframes?: boolean;

  /**
   * Custom hook to transform events before they are sent
   */
  beforeSend?: (event: eventWithTime) => eventWithTime | null | undefined;

  /**
   * When to start recording.
   * - 'DOMContentLoaded': Start recording after DOM is ready (earlier, before all resources load)
   * - 'load': Start recording after the page load event
   * @default 'load'
   */
  recordAfter?: 'DOMContentLoaded' | 'load';

  /**
   * Stop recording after this many milliseconds of no user interaction
   * (mouse moves, clicks, scrolls, viewport resizes, or input).
   *
   * When the user interacts again, recording resumes automatically with a
   * fresh rrweb checkpoint so the player has a complete DOM snapshot.
   *
   * Set to 0 or undefined to disable (record continuously).
   *
   * @default 60000 (1 minute)
   */
  inactivityThresholdMs?: number;

  /**
   * Redact query parameter values and fragments in `window.location.href` in rrweb
   * Meta events before they are sent to the Faro transport.
   *
   * URLs routinely contain sensitive data (OAuth codes, tokens in fragments, PII in
   * query parameters). This option replaces query parameter values and fragments with
   * `**redacted**`, preserving parameter keys for debugging.
   *
   * @default true
   */
  sanitizeMetaHref?: boolean;

  /**
   * The fraction of globally-sampled sessions that should also record a session replay.
   * Expressed as a number between 0 and 1.
   *
   * This rate is applied on top of the global `sessionTracking.samplingRate`.
   * The effective replay rate is:
   *
   *   effective = sessionTracking.samplingRate × samplingRate
   *
   * Examples (with sessionTracking.samplingRate = 1.0):
   *   - 1.0  → replay 100% of sampled sessions (default, current behaviour)
   *   - 0.5  → replay 50% of sampled sessions
   *   - 0.1  → replay 10% of sampled sessions
   *   - 0    → replay disabled
   *
   * Values outside [0, 1] are clamped and a debug warning is logged.
   *
   * @default 1
   */
  samplingRate?: number;
}

export type MaskInputOptions = Partial<{
  color: boolean;
  date: boolean;
  'datetime-local': boolean;
  email: boolean;
  month: boolean;
  number: boolean;
  range: boolean;
  search: boolean;
  tel: boolean;
  text: boolean;
  time: boolean;
  url: boolean;
  week: boolean;
  textarea: boolean;
  select: boolean;
  password: boolean;
}>;

export type MaskInputFn = (text: string, element: HTMLElement) => string;
