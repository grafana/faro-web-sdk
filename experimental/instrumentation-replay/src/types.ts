import type { eventWithTime } from '@rrweb/types';

export interface ReplayInstrumentationOptions {
  /**
   * Whether to mask all inputs
   * @default false
   */
  maskAllInputs?: boolean;

  /**
   * Whether to mask text inputs
   * @default { password: true }
   */
  maskInputOptions?: MaskInputOptions;

  /**
   * Custom function to transform input values before they are recorded.
   */
  maskInputFn?: MaskInputFn;

  /**
   * Custom CSS selector to mask text elements
   * @default undefined
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
