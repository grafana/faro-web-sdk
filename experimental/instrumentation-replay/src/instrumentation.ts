import { BaseInstrumentation, clampSamplingRate, VERSION } from '@grafana/faro-core';
import { record, type recordOptions } from '@grafana/rrweb';
import type { eventWithTime } from '@grafana/rrweb-types';

import { defaultMaskInputFn, defaultReplayInstrumentationOptions } from './const';
import { hasAnyPatternEnabled, valueMatchesEnabledPattern } from './patterns';
import { type MaskInputFn, type MaskInputOptions, PATTERN_MASK_KEYS, type ReplayInstrumentationOptions } from './types';

const faroSessionReplayEventName = 'faro.session_recording.event';
const faroSessionReplayStartedEventName = 'faro.session_recording.started';
const faroSessionReplayPausedEventName = 'faro.session_recording.paused';
const faroSessionReplayResumedEventName = 'faro.session_recording.resumed';

// DOM events that signal a human is present.  Aligned with rrweb's
// IncrementalSource 1-5 (MouseMove, MouseInteraction, Scroll,
// ViewportResize, Input).  We use pointer* instead of mouse*/touch*
// because modern browsers fire PointerEvents for all input devices.
const USER_INTERACTION_EVENTS: readonly string[] = [
  'pointermove', // MouseMove / TouchMove
  'pointerdown', // MouseInteraction (click, dblclick, etc.)
  'scroll', // Scroll
  'keydown', // Input
  'input', // Input (covers typing without keydown, e.g. autofill)
];

export class ReplayInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-instrumentation-replay';
  readonly version = VERSION;

  private stopFn: { (): void } | null = null;
  private isRecording: boolean = false;
  private isPaused: boolean = false;
  private options: ReplayInstrumentationOptions = defaultReplayInstrumentationOptions;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private boundOnUserInteraction: (() => void) | null = null;

  constructor(options: ReplayInstrumentationOptions = {}) {
    super();

    this.options = {
      ...defaultReplayInstrumentationOptions,
      ...options,
    };

    this.options.maskInputFn ??= defaultMaskInputFn;
  }

  initialize(): void {
    // Check if current session is sampled before starting recording
    this.checkAndUpdateRecording();

    // Listen for session changes
    this.metas.addListener(() => {
      this.checkAndUpdateRecording();
    });
  }

  private checkAndUpdateRecording(): void {
    const session = this.api.getSession();
    const isSampled = session?.attributes?.['isSampled'] === 'true';
    const sessionId = session?.id ?? null;

    if (!isSampled || sessionId === null) {
      if (this.isRecording) {
        this.logDebug('Session is not sampled, stopping recording');
        this.stopRecording();
      } else {
        this.logDebug('Session is not sampled, recording not started');
      }
      return;
    }

    // Globally sampled — apply replay sub-sampling using a deterministic hash of the
    // session ID so the decision is stable across page reloads within the same session.
    const replaySampled = this.shouldReplaySample(sessionId);

    if (replaySampled && !this.isRecording) {
      this.logDebug('Session is sampled for replay, starting recording');
      this.startRecording();
    } else if (!replaySampled && this.isRecording) {
      this.logDebug('Session is not sampled for replay, stopping recording');
      this.stopRecording();
    } else if (!replaySampled) {
      this.logDebug('Session is not sampled for replay, recording not started');
    }
  }

  private shouldReplaySample(sessionId: string): boolean {
    const samplingRate = this.options.samplingRate ?? 1;
    const clampedSamplingRate = clampSamplingRate(samplingRate);

    if (samplingRate !== clampedSamplingRate) {
      this.logWarn(`samplingRate ${samplingRate} is out of range [0, 1], clamping to ${clampedSamplingRate}`);
    }

    if (clampedSamplingRate === 0) {
      return false;
    }

    if (clampedSamplingRate === 1) {
      return true;
    }

    return this.hashSessionId(sessionId) < clampedSamplingRate;
  }

  // Produces a deterministic float in [0, 1] from a session ID string so that the
  // replay sampling decision is stable across page reloads for the same session.
  //
  // The >>> 0 (unsigned right-shift by zero) coerces the intermediate value to an
  // unsigned 32-bit integer. Without it, JS bitwise ops return signed 32-bit ints,
  // so values above 2,147,483,647 flip negative (e.g. 3,389,167,832 → -905,799,464)
  // and the final division would produce a negative number, breaking the comparison.

  private hashSessionId(sessionId: string): number {
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
    }
    return hash / 0xffffffff;
  }

  private stopRecording(): void {
    this.teardownInactivityTracking();
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }
    this.isRecording = false;
    this.isPaused = false;
    this.logDebug('Session replay stopped');
  }

  private buildRecordOptions(): recordOptions<eventWithTime> {
    const patternsEnabled = hasAnyPatternEnabled(this.options.maskInputOptions);
    const sanitizedMaskInputOptions = sanitizeMaskInputOptions(this.options.maskInputOptions);

    // rrweb only invokes `maskInputFn` for inputs it has already decided to
    // mask. When any value-pattern key is enabled we need our wrapper to see
    // every input, so we force `maskAllInputs: true` to rrweb and re-implement
    // the user's mask decision inside the wrapper (see #2169).
    const effectiveMaskAllInputs = patternsEnabled ? true : this.options.maskAllInputs;
    const maskInputFn = patternsEnabled ? this.buildPatternAwareMaskInputFn() : this.options.maskInputFn;

    return {
      emit: (event: eventWithTime, isCheckout?: boolean): void => {
        this.handleEvent(event, isCheckout);
      },
      checkoutEveryNms: 300_000, // 5 minutes
      recordCrossOriginIframes: this.options.recordCrossOriginIframes,
      maskAllInputs: effectiveMaskAllInputs,
      maskInputOptions: sanitizedMaskInputOptions,
      maskInputFn,
      maskTextSelector: this.options.maskTextSelector,
      blockSelector: this.options.blockSelector,
      ignoreSelector: this.options.ignoreSelector,
      recordCanvas: this.options.recordCanvas,
      collectFonts: this.options.collectFonts,
      inlineImages: this.options.inlineImages,
      recordDOM: true,
      inlineStylesheet: this.options.inlineStylesheet,
      recordAfter: this.options.recordAfter,
      errorHandler: (err) => {
        this.logError('Error occurred during session replay', err);
      },
    };
  }

  /**
   * Build a `maskInputFn` that masks values matching any enabled pattern key
   * (`ssn` / `creditCard` / `usAddress`), and otherwise reproduces what rrweb
   * would have done under the user's original `maskAllInputs` /
   * `maskInputOptions` / `maskInputFn` configuration.
   *
   * Length-preserving asterisks are used when masking so the replay's visual
   * layout doesn't shift, matching rrweb's own default.
   */
  private buildPatternAwareMaskInputFn(): MaskInputFn {
    const userOptions = this.options.maskInputOptions;
    const userMaskAllInputs = this.options.maskAllInputs;
    const userFn = this.options.maskInputFn;

    return (text, element) => {
      const mask = (): string => (userFn ? userFn(text, element) : '*'.repeat(text.length));

      if (valueMatchesEnabledPattern(text, userOptions)) {
        return mask();
      }
      if (wouldRrwebMask(element, userMaskAllInputs, userOptions)) {
        return mask();
      }
      return text;
    };
  }

  private startRrweb(): boolean {
    const stop = record(this.buildRecordOptions());
    if (stop) {
      this.stopFn = stop;
      return true;
    }
    return false;
  }

  private stopRrweb(): void {
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }
  }

  private startRecording(): void {
    try {
      this.startRrweb();

      this.isRecording = true;
      this.isPaused = false;
      this.logDebug('Session replay started');
      this.api.pushEvent(faroSessionReplayStartedEventName, {});

      this.setupInactivityTracking();
    } catch (err) {
      this.logWarn('Failed to start session replay', err);
    }
  }

  private pauseRecording(): void {
    if (!this.isRecording || this.isPaused) {
      return;
    }

    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    this.stopRrweb();
    this.isPaused = true;
    this.logDebug('Session replay paused due to inactivity');
    this.api.pushEvent(faroSessionReplayPausedEventName, {});
  }

  private resumeRecording(): void {
    if (!this.isPaused) {
      return;
    }

    try {
      this.startRrweb();

      this.isPaused = false;
      this.logDebug('Session replay resumed after user interaction');
      this.api.pushEvent(faroSessionReplayResumedEventName, {});

      this.resetInactivityTimer();
    } catch (err) {
      this.logWarn('Failed to resume session replay', err);
    }
  }

  private setupInactivityTracking(): void {
    const threshold = this.options.inactivityThresholdMs;
    if (!threshold || threshold <= 0) {
      return;
    }

    this.boundOnUserInteraction = () => {
      if (this.isPaused) {
        this.resumeRecording();
      } else {
        this.resetInactivityTimer();
      }
    };

    for (const eventName of USER_INTERACTION_EVENTS) {
      document.addEventListener(eventName, this.boundOnUserInteraction, { capture: true, passive: true });
    }

    this.resetInactivityTimer();
  }

  private teardownInactivityTracking(): void {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    if (this.boundOnUserInteraction) {
      for (const eventName of USER_INTERACTION_EVENTS) {
        document.removeEventListener(eventName, this.boundOnUserInteraction, { capture: true });
      }
      this.boundOnUserInteraction = null;
    }
  }

  private resetInactivityTimer(): void {
    const threshold = this.options.inactivityThresholdMs;
    if (!threshold || threshold <= 0) {
      return;
    }

    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      this.pauseRecording();
    }, threshold);
  }

  private handleEvent(event: eventWithTime, _isCheckout?: boolean): void {
    try {
      // Apply beforeSend transformation if provided
      let processedEvent: eventWithTime | null | undefined = event;
      if (this.options.beforeSend) {
        processedEvent = this.options.beforeSend(event);
        if (processedEvent === null || processedEvent === undefined) {
          return;
        }
      }

      this.api.pushEvent(faroSessionReplayEventName, {
        event: JSON.stringify(processedEvent),
      });
    } catch (err) {
      this.logWarn(`Failed to push ${faroSessionReplayEventName} event`, err);
    }
  }

  destroy(): void {
    this.stopRecording();
  }
}

/**
 * Strip the pattern-detection keys (`ssn`, `creditCard`, `usAddress`) before
 * forwarding `maskInputOptions` to rrweb, which only recognizes HTML input
 * type keys.
 */
function sanitizeMaskInputOptions(options: MaskInputOptions | undefined): MaskInputOptions | undefined {
  if (!options) {
    return options;
  }
  const out: MaskInputOptions = { ...options };
  for (const key of PATTERN_MASK_KEYS) {
    delete out[key];
  }
  return out;
}

/**
 * Recreate rrweb's decision about whether an element's value would be masked
 * under `maskAllInputs` + `maskInputOptions`, so the pattern-aware wrapper can
 * leave non-matching values untouched.
 */
function wouldRrwebMask(
  element: HTMLElement,
  maskAllInputs: boolean | undefined,
  options: MaskInputOptions | undefined
): boolean {
  if (maskAllInputs) {
    return true;
  }
  if (!options) {
    return false;
  }
  const tag = element.tagName?.toLowerCase();
  if (tag === 'textarea') {
    return Boolean(options.textarea);
  }
  if (tag === 'select') {
    return Boolean(options.select);
  }
  if (tag === 'input') {
    const type = ((element as HTMLInputElement).type || 'text').toLowerCase();
    return Boolean((options as Record<string, boolean | undefined>)[type]);
  }
  return false;
}
