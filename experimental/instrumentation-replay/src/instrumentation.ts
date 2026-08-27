import { BaseInstrumentation, clampSamplingRate, genShortID, VERSION } from '@grafana/faro-core';
import { record, type recordOptions } from '@grafana/rrweb';
import { EventType, type eventWithTime } from '@grafana/rrweb-types';

import { defaultMaskInputFn, defaultReplayInstrumentationOptions } from './const';
import type { ReplayInstrumentationOptions } from './types';

const faroSessionReplayEventName = 'faro.session_recording.event';
const faroSessionReplayStartedEventName = 'faro.session_recording.started';
const faroSessionReplayPausedEventName = 'faro.session_recording.paused';
const faroSessionReplayResumedEventName = 'faro.session_recording.resumed';

type RrwebEmit = (event: eventWithTime, isCheckout?: boolean) => void;

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
  readonly version: string = VERSION;

  private stopFn: { (): void } | null = null;
  private isRecording: boolean = false;
  private isPaused: boolean = false;
  private options: ReplayInstrumentationOptions = defaultReplayInstrumentationOptions;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private boundOnUserInteraction: (() => void) | null = null;

  private recordingId: string = genShortID();
  // -1 until the recording's first Meta event opens generation 0.
  private gen: number = -1;
  private seq: number = 0;
  // The session the current recording belongs to; a recording never spans two sessions.
  private recordingSessionId: string | null = null;
  private isStarting: boolean = false;
  private pendingStart: boolean = false;
  private destroyed: boolean = false;

  constructor(options: ReplayInstrumentationOptions = {}) {
    super();

    this.options = {
      ...defaultReplayInstrumentationOptions,
      ...options,
    };

    this.options.maskInputFn ??= defaultMaskInputFn;
  }

  initialize(): void {
    // Listen for session changes. Starts triggered from the listener are deferred out
    // of the call stack (see scheduleStartRecording).
    this.metas.addListener(() => {
      this.checkAndUpdateRecording(true);
    });

    this.checkAndUpdateRecording(false);
  }

  private checkAndUpdateRecording(deferStart: boolean): void {
    // A notification can arrive synchronously while rrweb's record() is still executing,
    // before the stop function is installed. Reconcile once the current call stack has
    // finished so the start attempt can finish setting up its state.
    if (this.isStarting) {
      this.scheduleStartRecording();
      return;
    }

    const session = this.api.getSession();

    // Core's setSession removes and re-adds the session meta, notifying listeners on
    // each step, so mid-rotation the listener transiently observes NO session meta at
    // all. Acting on that transient notification would stop and restart recording on
    // every setSession call; the follow-up notification carries the session to act on.
    // A deliberate session clear (resetSession / setSession(undefined)) is different:
    // it re-adds a session meta WITHOUT an id, which must stop recording below.
    if (session === undefined) {
      this.logDebug('No session meta present, awaiting the next session meta notification');
      return;
    }

    const sessionId = session.id ?? null;
    const isSampled = session.attributes?.['isSampled'] === 'true';

    // Globally sampled — apply replay sub-sampling using a deterministic hash of the
    // session ID so the decision is stable across page reloads within the same session.
    const replaySampled = sessionId !== null && isSampled && this.shouldReplaySample(sessionId);

    if (!replaySampled || sessionId === null) {
      if (this.isRecording) {
        this.logDebug('Session is not eligible for replay (unsampled or missing id), stopping recording');
        this.stopRecording();
      } else {
        this.logDebug('Session is not sampled, recording not started');
      }
      return;
    }

    if (this.isRecording) {
      if (this.recordingSessionId === sessionId) {
        return;
      }

      // The session rotated while recording: a recording belongs to exactly one
      // session, so end this one now (stopping pushes no events, making it safe inside
      // the listener call stack) and start the new session's recording deferred.
      this.logDebug('Session changed, restarting recording for the new session');
      this.stopRecording();
    }

    if (deferStart) {
      this.scheduleStartRecording();
    } else {
      this.startRecording(sessionId);
    }
  }

  // Defers a (re)start out of the metas-listener call stack. Session rotations are
  // typically detected inside a transport hook while the batch executor is flushing,
  // and the flush resets its buffer after sending, discarding items pushed during it —
  // a synchronous start would lose the new recording's Meta, FullSnapshot, and started
  // events. The pending flag coalesces rotation bursts (e.g. collector-forced session
  // re-creation) into one start, and the full decision is re-evaluated at execution
  // time, so a start that raced a concurrent rotation converges on the latest session.
  private scheduleStartRecording(): void {
    if (this.pendingStart) {
      return;
    }
    this.pendingStart = true;

    void Promise.resolve().then(() => {
      this.pendingStart = false;
      if (this.destroyed) {
        return;
      }

      this.checkAndUpdateRecording(false);
    });
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
    this.stopRrweb();
    this.isRecording = false;
    this.isPaused = false;
    this.logDebug('Session replay stopped');
  }

  private buildRecordOptions(
    emit: RrwebEmit = (event, isCheckout) => this.handleEvent(event, isCheckout)
  ): recordOptions<eventWithTime> {
    return {
      emit,
      checkoutEveryNms: 300_000, // 5 minutes
      recordCrossOriginIframes: this.options.recordCrossOriginIframes,
      maskAllInputs: this.options.maskAllInputs,
      maskInputOptions: this.options.maskInputOptions,
      maskInputFn: this.options.maskInputFn,
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

  private startRrweb(lifecycleEventName: string): boolean {
    const bufferedEvents: Array<[event: eventWithTime, isCheckout?: boolean]> = [];
    const attempt: { phase: 'buffering' | 'active' | 'discarded' } = { phase: 'buffering' };
    const wasRecording = this.isRecording;
    const wasPaused = this.isPaused;
    const discardAttempt = (): void => {
      attempt.phase = 'discarded';
      bufferedEvents.length = 0;
    };

    this.isStarting = true;
    let stop: (() => void) | undefined;
    try {
      stop = record(
        this.buildRecordOptions((event, isCheckout) => {
          if (attempt.phase === 'buffering') {
            bufferedEvents.push([event, isCheckout]);
          } else if (attempt.phase === 'active') {
            this.handleEvent(event, isCheckout);
          }
        })
      );
    } catch (err) {
      discardAttempt();
      throw err;
    } finally {
      this.isStarting = false;
    }

    if (!stop) {
      discardAttempt();
      return false;
    }

    const stopAttempt = (): void => {
      discardAttempt();
      stop!();
    };
    const recordingId = this.recordingId;
    const isCurrentAttempt = (): boolean =>
      this.isRecording && this.stopFn === stopAttempt && this.recordingId === recordingId;

    this.stopFn = stopAttempt;
    this.isRecording = true;
    this.isPaused = false;

    try {
      this.api.pushEvent(lifecycleEventName, { recording_id: recordingId });

      for (const [event, isCheckout] of bufferedEvents) {
        if (!isCurrentAttempt()) {
          discardAttempt();
          return true;
        }
        this.handleEvent(event, isCheckout);
      }

      if (!isCurrentAttempt()) {
        discardAttempt();
        return true;
      }

      bufferedEvents.length = 0;
      attempt.phase = 'active';
      return true;
    } catch (err) {
      if (this.stopFn === stopAttempt) {
        this.stopRrweb();
        this.isRecording = wasRecording;
        this.isPaused = wasPaused;
      }
      throw err;
    }
  }

  private stopRrweb(): void {
    const stop = this.stopFn;
    this.stopFn = null;

    if (stop) {
      try {
        stop();
      } catch (err) {
        this.logWarn('Failed to stop session replay', err);
      }
    }
  }

  private startRecording(sessionId: string): void {
    try {
      // Mint a fresh delivery identity for every rrweb start except the inactivity
      // pause-resume, which continues the current recording (see resumeRecording).
      this.recordingId = genShortID();
      this.gen = -1;
      this.seq = 0;
      this.recordingSessionId = sessionId;

      if (!this.startRrweb(faroSessionReplayStartedEventName)) {
        // Not marked as recording, so a later session notification can retry.
        this.logWarn('Failed to start session replay: rrweb did not start');
        return;
      }

      if (!this.isRecording) {
        return;
      }

      this.logDebug('Session replay started');

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
    this.api.pushEvent(faroSessionReplayPausedEventName, { recording_id: this.recordingId });
  }

  private resumeRecording(): void {
    if (!this.isPaused) {
      return;
    }

    try {
      if (!this.startRrweb(faroSessionReplayResumedEventName)) {
        // Stays paused, so the next user interaction can retry the resume.
        this.logWarn('Failed to resume session replay: rrweb did not start');
        return;
      }

      if (!this.isRecording || this.isPaused) {
        return;
      }

      this.logDebug('Session replay resumed after user interaction');

      this.resetInactivityTimer();
    } catch (err) {
      this.logWarn('Failed to resume session replay', err);
    }
  }

  private setupInactivityTracking(): void {
    // Defensive: a re-entrant stop/start cycle must never leak a previous closure's
    // document listeners.
    this.teardownInactivityTracking();

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

  private sanitizeMetaHref(event: eventWithTime): void {
    if (event.type !== EventType.Meta || this.options.sanitizeMetaHref === false) {
      return;
    }

    const data = event.data;
    if (data == null || typeof data !== 'object' || !('href' in data) || typeof data.href !== 'string') {
      return;
    }

    data.href = this.sanitizeUrl(data.href);
  }

  private sanitizeUrl(href: string): string {
    try {
      const url = new URL(href);
      url.username = '';
      url.password = '';
      url.search = '';
      url.hash = '';
      return url.href;
    } catch {
      // Malformed URL — leave as-is rather than risk breaking the event.
      return href;
    }
  }

  private handleEvent(event: eventWithTime, _isCheckout?: boolean): void {
    try {
      this.sanitizeMetaHref(event);

      // Apply beforeSend transformation if provided
      let processedEvent: eventWithTime | null | undefined = event;
      if (this.options.beforeSend) {
        processedEvent = this.options.beforeSend(event);
        if (processedEvent === null || processedEvent === undefined) {
          return;
        }
        this.sanitizeMetaHref(processedEvent);
      }

      // gen advances when the emitted event is a Meta — the event that opens a new
      // independently playable chain. rrweb's isCheckout flag is not usable as the
      // trigger: it marks both the Meta and the FullSnapshot of a scheduled checkout
      // and neither event of an initial or post-resume snapshot.
      if (processedEvent.type === EventType.Meta) {
        this.gen++;
      }

      const attributes: Record<string, string> = {
        event: JSON.stringify(processedEvent),
        recording_id: this.recordingId,
        // Clamped for the never-observed case of an event emitted before the first Meta.
        gen: String(Math.max(this.gen, 0)),
        // seq is recording-wide and never resets on a generation change, so any hole in
        // stored sequence numbers is proof of loss.
        seq: String(this.seq),
      };
      this.seq++;

      this.api.pushEvent(faroSessionReplayEventName, attributes);
    } catch (err) {
      this.logWarn(`Failed to push ${faroSessionReplayEventName} event`, err);
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.stopRecording();
  }
}
