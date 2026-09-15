import { BaseInstrumentation, captureMetas, clampSamplingRate, genShortID, VERSION } from '@grafana/faro-core';
import { record, type recordOptions } from '@grafana/rrweb';
import { EventType, type eventWithTime } from '@grafana/rrweb-types';

import { defaultMaskInputFn, defaultReplayInstrumentationOptions } from './const';
import { createMemoryStorage, type ReplayRecordingState, ReplayRecordingStateStore } from './recordingState';
import type { ReplayInstrumentationOptions } from './types';

const faroSessionReplayEventName = 'faro.session_recording.event';
const faroSessionReplayStartedEventName = 'faro.session_recording.started';
const faroSessionReplayPausedEventName = 'faro.session_recording.paused';
const faroSessionReplayResumedEventName = 'faro.session_recording.resumed';

// When localStorage cannot be accessed or written, checkpoints live only as long as this
// Document: same-document replacement still continues, cross-Document navigation starts a
// recovery recording.
let documentLocalCheckpointStorage: Storage | undefined;
const sharedStorageProbeKey = 'com.grafana.faro.replay.probe';

interface ActiveRecordingHandoff {
  sessionId: string;
  recordingId: string;
}

interface RecordingOwnerState {
  handoff?: ActiveRecordingHandoff;
  abandonedRecordingIds: Set<string>;
}

const recordingOwners = new WeakMap<Document, Map<string, RecordingOwnerState>>();

function getRecordingOwnerState(namespace: string): RecordingOwnerState {
  let owners = recordingOwners.get(document);
  if (!owners) {
    owners = new Map();
    recordingOwners.set(document, owners);
  }
  let owner = owners.get(namespace);
  if (!owner) {
    owner = { abandonedRecordingIds: new Set() };
    owners.set(namespace, owner);
  }
  return owner;
}

function takeActiveRecordingHandoff(namespace: string): ActiveRecordingHandoff | undefined {
  const owner = getRecordingOwnerState(namespace);
  const handoff = owner.handoff;
  delete owner.handoff;
  return handoff;
}

type RrwebEmit = (event: eventWithTime) => void;

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

  private recordingState: ReplayRecordingState | undefined;
  private pageHidden = false;
  private recordingStateStore: ReplayRecordingStateStore | undefined;
  private recordingOwnerNamespace!: string;

  // record() may notify listeners before returning its stop function.
  private isStarting: boolean = false;
  // Coalesce re-entrant session changes into one deferred start.
  private pendingStart: boolean = false;
  private destroyed: boolean = false;
  // Deferred starts belong to the lifecycle that scheduled them.
  private lifecycle = 0;
  // Prevent an invalidated attempt from reviving if the same session returns.
  private attemptRevision = 0;

  private readonly metasListener = (): void => {
    this.checkAndUpdateRecording(true);
  };

  private readonly pageHideListener = (): void => {
    if (this.destroyed) {
      return;
    }
    this.pageHidden = true;
    if (!this.recordingState) {
      return;
    }
    this.stopRecording();
    this.recordingStateStore?.seal(this.recordingState);
  };

  private readonly pageShowListener = (event: PageTransitionEvent): void => {
    if (this.destroyed || !event.persisted || !this.pageHidden) {
      return;
    }
    this.pageHidden = false;
    this.recordingState = undefined;
    this.checkAndUpdateRecording(false);
  };

  // A competing claim can arrive after that Document has already sealed its checkpoint.
  // Revoke this identity before restarting, rather than adopting its now-clean counters.
  private readonly storageListener = (event: StorageEvent): void => {
    if (this.destroyed || this.pageHidden || !this.recordingState) {
      return;
    }
    if (
      !this.recordingStateStore?.hasLostOwnership(
        this.recordingState.recordingId,
        event.key,
        event.newValue,
        event.storageArea
      )
    ) {
      return;
    }
    this.logDebug('Recording checkpoint was claimed by another document, starting a recovery recording');
    this.recordingStateStore.abandon(this.recordingState.recordingId);
    this.stopRecording();
    this.recordingState = undefined;
    this.checkAndUpdateRecording(false);
  };

  constructor(options: ReplayInstrumentationOptions = {}) {
    super();

    this.options = {
      ...defaultReplayInstrumentationOptions,
      ...options,
    };

    this.options.maskInputFn ??= defaultMaskInputFn;
  }

  initialize(): void {
    this.destroyed = false;
    this.pageHidden = false;
    // Owner identity excludes deployment versions so navigation can cross releases.
    this.recordingOwnerNamespace = JSON.stringify([
      this.config.globalObjectKey,
      this.config.app?.name ?? '',
      this.config.app?.namespace ?? '',
      this.config.app?.environment ?? '',
    ]);
    this.recordingStateStore = new ReplayRecordingStateStore({
      tabStorage: this.getSessionStorage(),
      sharedStorage: this.getSharedCheckpointStorage(),
      ownerNamespace: this.recordingOwnerNamespace,
      documentId: genShortID(),
      generateRecordingId: genShortID,
      abandonedRecordingIds: getRecordingOwnerState(this.recordingOwnerNamespace).abandonedRecordingIds,
    });
    this.recordingStateStore.removeLegacyState();
    this.lifecycle++;
    // A listener already being notified can still queue work after destroy().
    this.pendingStart = false;

    // Listen for session changes. Starts triggered from the listener are deferred out
    // of the call stack (see scheduleStartRecording).
    this.metas.addListener(this.metasListener);
    window.addEventListener('pagehide', this.pageHideListener, { capture: true });
    window.addEventListener('pageshow', this.pageShowListener, { capture: true });
    window.addEventListener('storage', this.storageListener);

    this.checkAndUpdateRecording(false);
  }

  private getSessionStorage(): Storage | undefined {
    try {
      return typeof window === 'undefined' ? undefined : window.sessionStorage;
    } catch {
      return undefined;
    }
  }

  private getSharedCheckpointStorage(): Storage | undefined {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storage = window.localStorage;
        // Access can succeed while writes fail, for example once the origin's quota is
        // full. Probe once so a broken storage degrades to the Document-local fallback
        // instead of failing every checkpoint.
        storage.setItem(sharedStorageProbeKey, '1');
        storage.removeItem(sharedStorageProbeKey);
        return storage;
      }
    } catch {
      // Fall through to the Document-local fallback.
    }

    documentLocalCheckpointStorage ??= createMemoryStorage();
    return documentLocalCheckpointStorage;
  }

  private checkAndUpdateRecording(deferStart: boolean): void {
    if (this.pageHidden) {
      return;
    }

    // A notification can arrive synchronously while rrweb's record() is still executing,
    // before the stop function is installed. Reconcile once the current call stack has
    // finished so the start attempt can finish setting up its state.
    if (this.isStarting) {
      const session = this.api.getSession();
      if (session !== undefined && !this.isRecordingSessionEligible()) {
        this.attemptRevision++;
      }
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

    const sessionId = this.currentEligibleSessionId();

    if (sessionId === null) {
      if (this.isRecording) {
        this.logDebug('Session is not eligible for replay (unsampled or missing id), stopping recording');
        this.stopRecording();
      } else {
        this.logDebug('Session is not sampled, recording not started');
      }
      return;
    }

    if (this.isRecording) {
      if (this.recordingState?.sessionId === sessionId) {
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

  // Defer starts out of re-entrant metadata callbacks and transport hooks.
  // Re-evaluate the latest session when the coalesced start executes.
  private scheduleStartRecording(): void {
    if (this.pendingStart) {
      return;
    }
    this.pendingStart = true;
    const lifecycle = this.lifecycle;

    void Promise.resolve().then(() => {
      if (lifecycle !== this.lifecycle) {
        return;
      }
      this.pendingStart = false;
      if (this.destroyed) {
        return;
      }

      this.checkAndUpdateRecording(false);
    });
  }

  // Passive eligibility check; capture reconciliation is explicit at the caller.
  private currentEligibleSessionId(): string | null {
    const session = this.api.getSession();
    if (session === undefined) {
      return null;
    }

    const sessionId = session.id ?? null;
    const isSampled = session.attributes?.['isSampled'] === 'true';

    if (sessionId === null || !isSampled || !this.shouldReplaySample(sessionId)) {
      return null;
    }

    return sessionId;
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

  private buildRecordOptions(emit: RrwebEmit): recordOptions<eventWithTime> {
    return {
      emit,
      checkoutEveryNms: 300_000, // 5 minutes
      recordCrossOriginIframes: this.options.recordCrossOriginIframes,
      maskAllInputs: this.options.maskAllInputs,
      maskInputOptions: this.options.maskInputOptions,
      maskInputFn: this.options.maskInputFn,
      maskTextClass: 'grafana-mask',
      blockClass: 'grafana-block',
      ignoreClass: 'grafana-ignore',
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

  // Passive: capture reconciliation must happen before validating the attempt.
  private isRecordingSessionEligible(): boolean {
    if (this.destroyed || this.pageHidden || !this.recordingState) {
      return false;
    }

    const session = this.api.getSession();
    return (
      session?.id === this.recordingState.sessionId &&
      session.attributes?.['isSampled'] === 'true' &&
      this.shouldReplaySample(this.recordingState.sessionId)
    );
  }

  // rrweb can emit snapshots synchronously before returning its stop function.
  // Publish only after startup succeeds and the attempt remains eligible.
  private startRrweb(lifecycleEventName: string): boolean {
    const state = this.recordingState!;
    const bufferedEvents: eventWithTime[] = [];
    const attempt: { phase: 'buffering' | 'active' | 'discarded' } = { phase: 'buffering' };
    const revision = this.attemptRevision;
    const isValid = (): boolean =>
      attempt.phase !== 'discarded' && revision === this.attemptRevision && this.isRecordingSessionEligible();
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
        this.buildRecordOptions((event) => {
          if (attempt.phase === 'buffering') {
            bufferedEvents.push(event);
          } else if (attempt.phase === 'active') {
            this.handleEvent(event, isCurrentAttempt);
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

    if (!isValid()) {
      // Stop before publishing anything from an invalidated startup.
      discardAttempt();
      try {
        stop();
      } catch (err) {
        this.logWarn('Failed to stop session replay', err);
      } finally {
        this.stopRecording();
      }
      this.logDebug('Recorder start attempt invalidated');
      return false;
    }

    const stopAttempt = (): void => {
      discardAttempt();
      stop!();
    };
    const recordingId = state.recordingId;
    const isCurrentAttempt = (): boolean =>
      isValid() && this.isRecording && this.stopFn === stopAttempt && this.recordingState === state;

    this.stopFn = stopAttempt;
    this.isRecording = true;
    this.isPaused = false;

    // Telemetry failure does not undo a successfully installed recorder.
    try {
      this.api.pushEvent(lifecycleEventName, { recording_id: recordingId });
    } catch (err) {
      this.logWarn(`Failed to push ${lifecycleEventName} event`, err);
    }

    try {
      for (const event of bufferedEvents) {
        if (!isCurrentAttempt()) {
          discardAttempt();
          return true;
        }
        this.handleEvent(event, isCurrentAttempt);
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
    this.attemptRevision++;
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
      captureMetas(this.metas, () => {
        // A capture listener may have reinitialized and started this instrumentation.
        if (this.isRecording) {
          return;
        }

        const eligibleSessionId = this.currentEligibleSessionId();
        if (this.destroyed || this.pageHidden || eligibleSessionId === null || eligibleSessionId !== sessionId) {
          this.logDebug('Session changed during reconciliation, deferring recording start');
          return;
        }

        if (this.recordingState?.sessionId !== sessionId) {
          const handoff = takeActiveRecordingHandoff(this.recordingOwnerNamespace);
          this.recordingState = this.recordingStateStore!.claim(
            sessionId,
            handoff?.sessionId === sessionId ? handoff.recordingId : undefined
          );
        }

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
      });
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

    // Metadata reconciliation must not prevent the local inactivity pause.
    this.stopRrweb();
    this.isPaused = true;
    this.logDebug('Session replay paused due to inactivity');

    try {
      captureMetas(this.metas, () => {
        if (!this.isRecording || !this.isPaused || !this.isRecordingSessionEligible()) {
          return;
        }

        this.api.pushEvent(faroSessionReplayPausedEventName, { recording_id: this.recordingState!.recordingId });
      });
    } catch (err) {
      this.logWarn('Failed to push session replay paused event', err);
    }
  }

  private resumeRecording(): void {
    if (!this.isPaused) {
      return;
    }

    try {
      captureMetas(this.metas, () => {
        // A capture listener may have installed a fresh recorder.
        if (this.isRecording && !this.isPaused) {
          return;
        }

        if (!this.isRecording || !this.isPaused || !this.isRecordingSessionEligible()) {
          this.logDebug('Recording session no longer eligible, stopping instead of resuming');
          this.stopRecording();
          return;
        }

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
      });
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

    clearTimeout(this.inactivityTimer ?? undefined);

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

  private handleEvent(event: eventWithTime, isCurrentAttempt: () => boolean): void {
    const state = this.recordingState;
    try {
      captureMetas(this.metas, () => {
        if (!state || !isCurrentAttempt()) {
          return;
        }

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

        // beforeSend is user code and may itself synchronously rotate the session or
        // otherwise invalidate this attempt; re-validate after it runs, not just before.
        if (!isCurrentAttempt()) {
          return;
        }

        if (processedEvent.type === EventType.Meta) {
          state.gen++;
        }
        // Reserve after acceptance but before serialization: a failed event leaves
        // a detectable gap, without moving its snapshot back to the previous gen.
        // Capture gen alongside seq: serialization runs user code (toJSON) that may
        // re-enter with a later Meta and advance state.gen before we read it.
        const seq = state.nextSeq++;
        const gen = Math.max(state.gen, 0);
        const serializedEvent = JSON.stringify(processedEvent);
        if (!isCurrentAttempt()) {
          return;
        }
        this.api.pushEvent(faroSessionReplayEventName, {
          event: serializedEvent,
          recording_id: state.recordingId,
          gen: String(gen),
          seq: String(seq),
        });
      });
    } catch (err) {
      this.logWarn(`Failed to push ${faroSessionReplayEventName} event`, err);
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.pendingStart = false;
    this.metas.removeListener?.(this.metasListener);
    window.removeEventListener('pagehide', this.pageHideListener, { capture: true });
    window.removeEventListener('pageshow', this.pageShowListener, { capture: true });
    window.removeEventListener('storage', this.storageListener);
    this.stopRecording();
    const state = this.recordingState;
    if (state) {
      if (this.recordingStateStore?.checkpoint(state)) {
        getRecordingOwnerState(this.recordingOwnerNamespace).handoff = state;
      }
      this.recordingState = undefined;
    }
  }
}
