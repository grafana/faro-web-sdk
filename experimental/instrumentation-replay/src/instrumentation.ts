import { BaseInstrumentation, captureMetas, clampSamplingRate, genShortID, VERSION } from '@grafana/faro-core';
import { record, type recordOptions } from '@grafana/rrweb';
import { EventType, type eventWithTime } from '@grafana/rrweb-types';

import { defaultMaskInputFn, defaultReplayInstrumentationOptions } from './const';
import { getRecordingDocument, type RecordingDocument } from './documentLifecycle';
import { type RecordingLease, ReplayRecordingStateStore } from './recordingState';
import { finishRrweb, registerReplayProducer, runInRrweb, waitForRrwebCleanup } from './rrwebRuntime';
import type { ReplayInstrumentationOptions } from './types';

const replayEvent = 'faro.session_recording.event';
const startedEvent = 'faro.session_recording.started';
const pausedEvent = 'faro.session_recording.paused';
const resumedEvent = 'faro.session_recording.resumed';
const interactionEvents = ['pointermove', 'pointerdown', 'scroll', 'keydown', 'input'];

interface RecorderAttempt {
  lease: RecordingLease;
  activation: object;
  fallback: 'idle' | 'paused';
  buffer?: eventWithTime[];
  stop?: () => void;
}

type RecorderState = { phase: 'idle' | 'paused' } | { phase: 'starting' | 'recording'; attempt: RecorderAttempt };

interface Acquisition {
  controller: AbortController;
  activation: object;
  sessionId?: string;
  finished: Promise<void>;
  finish: () => void;
}

interface Initialization {
  document: RecordingDocument;
  activation: object;
  store: ReplayRecordingStateStore;
  recorder: RecorderState;
  unregisterProducer: () => void;
  disposers: Array<() => void>;
  acquisition?: Acquisition;
  lease?: RecordingLease;
  startTask?: object;
  supersededActivation?: object;
  inactivityTimer?: ReturnType<typeof setTimeout>;
  removeInteractions?: () => void;
}

export class ReplayInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-instrumentation-replay';
  readonly version: string = VERSION;
  private readonly options: ReplayInstrumentationOptions;
  private readonly samplingRate: number;
  private initialization?: Initialization;

  constructor(options: ReplayInstrumentationOptions = {}) {
    super();
    this.options = { ...defaultReplayInstrumentationOptions, ...options };
    this.options.maskInputFn ??= defaultMaskInputFn;
    this.samplingRate = clampSamplingRate(this.options.samplingRate ?? 1);
  }

  initialize(): void {
    this.destroy();
    if (this.initialization) {
      return;
    }
    const unregisterProducer = registerReplayProducer({});
    try {
      const recordingDocument = getRecordingDocument();
      const namespace = JSON.stringify([
        this.config.globalObjectKey,
        this.config.app?.name ?? '',
        this.config.app?.namespace ?? '',
        this.config.app?.environment ?? '',
      ]);
      const init: Initialization = {
        document: recordingDocument,
        activation: recordingDocument.activation,
        store: this.createStore(recordingDocument, namespace),
        recorder: { phase: 'idle' },
        unregisterProducer,
        disposers: [],
      };
      this.initialization = init;
      try {
        const metas = this.metas;
        const listener = () => this.reconcile(init);
        this.register(
          init,
          () => metas.addListener(listener),
          () => metas.removeListener(listener)
        );
        if (!this.current(init)) {
          return;
        }
        init.disposers.push(
          recordingDocument.subscribe(() => {
            if (!this.current(init)) {
              return;
            }
            if (recordingDocument.phase !== 'active') {
              init.startTask = undefined;
              this.cancelAcquisition(init);
              this.endLease(init);
              return;
            }
            if (init.activation !== recordingDocument.activation) {
              init.activation = recordingDocument.activation;
              init.store = this.createStore(recordingDocument, namespace);
            }
            this.scheduleStart(init);
          })
        );

        const recover = (event: Event) => {
          if (!this.current(init)) {
            return;
          }
          if (recordingDocument.phase === 'pageswap') {
            // Navigation errors and transition promises also occur on successful
            // navigation. Trusted input is an explicit retained-page retry trigger.
            if (event.isTrusted && document.visibilityState === 'visible') {
              recordingDocument.resumeRetainedActivation();
            }
          } else if (recordingDocument.phase === 'active' && init.recorder.phase === 'idle') {
            this.scheduleStart(init);
          }
        };
        for (const name of ['pointerdown', 'keydown']) {
          this.register(
            init,
            () => document.addEventListener(name, recover, { capture: true, passive: true }),
            () => document.removeEventListener(name, recover, { capture: true })
          );
        }
        if ((this.options.samplingRate ?? 1) !== this.samplingRate) {
          this.logWarn(
            `samplingRate ${this.options.samplingRate} is out of range [0, 1], clamping to ${this.samplingRate}`
          );
        }
        this.scheduleStart(init);
      } catch (error) {
        if (this.current(init)) {
          this.destroy();
        }
        throw error;
      }
    } catch (error) {
      unregisterProducer();
      throw error;
    }
  }

  private createStore(recordingDocument: RecordingDocument, namespace: string): ReplayRecordingStateStore {
    let storage: Storage | undefined;
    try {
      storage = window.sessionStorage;
    } catch {
      // The same native lease protocol also owns document-local counters.
    }
    return new ReplayRecordingStateStore({
      storage,
      ownerNamespace: namespace,
      documentId: recordingDocument.id,
      documentState: recordingDocument.state(namespace),
      generateRecordingId: genShortID,
    });
  }

  private current(init: Initialization): boolean {
    return this.initialization === init;
  }

  private active(init: Initialization): boolean {
    return (
      this.current(init) &&
      init.document.phase === 'active' &&
      init.activation === init.document.activation &&
      init.supersededActivation !== init.activation
    );
  }

  private eligibleSessionId(): string | null {
    const session = this.api.getSession();
    if (!session?.id || session.attributes?.['isSampled'] !== 'true' || !this.shouldReplaySample(session.id)) {
      return null;
    }
    return session.id;
  }

  private shouldReplaySample(sessionId: string): boolean {
    if (this.samplingRate === 0 || this.samplingRate === 1) {
      return this.samplingRate === 1;
    }
    let hash = 0;
    for (let index = 0; index < sessionId.length; index++) {
      hash = (hash * 31 + sessionId.charCodeAt(index)) >>> 0;
    }
    return hash / 0xffffffff < this.samplingRate;
  }

  private reconcile(init: Initialization): void {
    if (!this.current(init)) {
      return;
    }
    const sessionId = this.eligibleSessionId();
    if (!this.current(init)) {
      return;
    }
    if (init.acquisition?.sessionId && init.acquisition.sessionId !== sessionId) {
      this.cancelAcquisition(init);
    }
    if (init.lease) {
      const ownership = init.lease.ownership();
      if (!this.current(init)) {
        return;
      }
      if (ownership === 'superseded') {
        init.supersededActivation = init.activation;
      }
      if (this.active(init) && ownership === 'owned' && init.lease.state.sessionId === sessionId) {
        return;
      }
      this.endLease(init);
    }
    if (sessionId) {
      this.scheduleStart(init);
    }
  }

  private scheduleStart(init: Initialization): void {
    if (
      !this.active(init) ||
      init.startTask ||
      init.acquisition ||
      init.recorder.phase === 'starting' ||
      init.recorder.phase === 'recording'
    ) {
      return;
    }
    const task = {};
    init.startTask = task;
    void Promise.resolve().then(async () => {
      await waitForRrwebCleanup();
      if (!this.active(init) || init.startTask !== task) {
        return;
      }
      init.startTask = undefined;
      if (init.lease) {
        this.resume(init);
      } else {
        this.acquire(init);
      }
    });
  }

  private acquire(init: Initialization): void {
    if (!this.active(init) || init.acquisition) {
      return;
    }
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const acquisition: Acquisition = {
      controller: new AbortController(),
      activation: init.activation,
      finished,
      finish,
    };
    init.acquisition = acquisition;
    void this.acquireRecording(init, acquisition);
  }

  private ownsAcquisition(init: Initialization, acquisition: Acquisition): boolean {
    return (
      this.active(init) &&
      init.acquisition === acquisition &&
      acquisition.activation === init.activation &&
      !acquisition.controller.signal.aborted
    );
  }

  private async acquireRecording(init: Initialization, acquisition: Acquisition): Promise<void> {
    try {
      captureMetas(this.metas);
      if (!this.ownsAcquisition(init, acquisition)) {
        return;
      }
      const sessionId = this.eligibleSessionId();
      if (!sessionId || !this.ownsAcquisition(init, acquisition)) {
        return;
      }
      acquisition.sessionId = sessionId;
      const lease = await init.store.acquire(sessionId, acquisition.controller.signal, () => {
        if (!this.ownsAcquisition(init, acquisition)) {
          return null;
        }
        captureMetas(this.metas);
        return this.ownsAcquisition(init, acquisition) ? this.eligibleSessionId() : null;
      });
      if (!lease) {
        return;
      }
      if (!this.ownsAcquisition(init, acquisition)) {
        lease.release();
        await lease.released;
        return;
      }
      init.acquisition = undefined;
      // Install lease ownership before capture or rrweb can call application code.
      init.lease = lease;
      try {
        captureMetas(this.metas, () => {
          if (this.active(init) && init.lease === lease && this.eligibleSessionId() === lease.state.sessionId) {
            this.startAttempt(init, lease, 'idle');
          }
        });
        if (init.lease === lease && init.recorder.phase === 'idle') {
          this.endLease(init);
        }
      } catch (error) {
        if (init.lease === lease) {
          this.endLease(init);
        }
        throw error;
      }
    } catch (error) {
      if (this.current(init) && !acquisition.controller.signal.aborted) {
        this.logWarn('Failed to start session replay', error);
      }
    } finally {
      if (init.acquisition === acquisition) {
        init.acquisition = undefined;
      }
      acquisition.finish();
    }
  }

  private cancelAcquisition(init: Initialization): void {
    const acquisition = init.acquisition;
    if (acquisition) {
      init.acquisition = undefined;
      acquisition.controller.abort();
      finishRrweb(() => acquisition.finished);
    }
  }

  private ownsAttempt(init: Initialization, attempt: RecorderAttempt): boolean {
    return (
      this.active(init) &&
      init.lease === attempt.lease &&
      init.activation === attempt.activation &&
      (init.recorder.phase === 'starting' || init.recorder.phase === 'recording') &&
      init.recorder.attempt === attempt
    );
  }

  private currentAttempt(init: Initialization, attempt: RecorderAttempt): boolean {
    if (!this.ownsAttempt(init, attempt)) {
      return false;
    }
    const sessionId = this.eligibleSessionId();
    const ownership = attempt.lease.ownership();
    if (!this.ownsAttempt(init, attempt)) {
      return false;
    }
    if (sessionId !== attempt.lease.state.sessionId || ownership !== 'owned') {
      if (ownership === 'superseded') {
        init.supersededActivation = init.activation;
      }
      this.endLease(init);
      if (sessionId) {
        this.scheduleStart(init);
      }
      return false;
    }
    return true;
  }

  private startAttempt(init: Initialization, lease: RecordingLease, fallback: 'idle' | 'paused'): void {
    // Eligibility getters can dispose or replace the caller's initialization.
    if (!this.active(init) || init.lease !== lease) {
      return;
    }
    const attempt: RecorderAttempt = { lease, activation: init.activation, fallback, buffer: [] };
    init.recorder = { phase: 'starting', attempt };
    try {
      runInRrweb(() => {
        const stop = record(this.recordOptions(init, attempt));
        attempt.stop = stop;
        if (!this.currentAttempt(init, attempt)) {
          // The stale handle belongs only to this attempt. A queued finalizer
          // can now stop it after record()/checkout/deferred setup has returned.
          finishRrweb(() => this.stopAttempt(attempt));
          return;
        }
        if (!stop) {
          this.failAttempt(init, attempt);
          return;
        }
        init.recorder = { phase: 'recording', attempt };
        this.pushLifecycle(init, lease, fallback === 'paused' ? resumedEvent : startedEvent);
        const buffer = attempt.buffer!;
        for (let index = 0; index < buffer.length; index++) {
          if (!this.currentAttempt(init, attempt)) {
            return;
          }
          this.handleEvent(init, attempt, buffer[index]!);
        }
        if (this.currentAttempt(init, attempt)) {
          attempt.buffer = undefined;
          this.trackInteractions(init);
          this.resetInactivityTimer(init);
        }
      });
    } catch (error) {
      this.failAttempt(init, attempt);
      this.logWarn('Failed to start session replay', error);
    }
  }

  private failAttempt(init: Initialization, attempt: RecorderAttempt): void {
    if (!this.ownsAttempt(init, attempt)) {
      return;
    }
    attempt.buffer = undefined;
    if (attempt.fallback === 'paused') {
      init.recorder = { phase: 'paused' };
      finishRrweb(() => this.stopAttempt(attempt));
    } else {
      this.endLease(init);
    }
  }

  private stopAttempt(attempt?: RecorderAttempt): void {
    const stop = attempt?.stop;
    if (attempt) {
      attempt.stop = undefined;
      attempt.buffer?.splice(0);
      attempt.buffer = undefined;
    }
    if (stop) {
      try {
        runInRrweb(stop);
      } catch (error) {
        this.logWarn('Failed to stop session replay', error);
      }
    }
  }

  private endLease(init: Initialization): void {
    const lease = init.lease;
    const attempt =
      init.recorder.phase === 'starting' || init.recorder.phase === 'recording' ? init.recorder.attempt : undefined;
    init.lease = undefined;
    init.recorder = { phase: 'idle' };
    this.removeInteractionTracking(init);
    if (lease) {
      finishRrweb(() => {
        try {
          this.stopAttempt(attempt);
        } finally {
          lease.release();
        }
        return lease.released;
      });
    }
  }

  private pause(init: Initialization): void {
    if (!this.active(init) || init.recorder.phase !== 'recording' || !init.lease) {
      return;
    }
    const { attempt } = init.recorder;
    const lease = init.lease;
    init.recorder = { phase: 'paused' };
    clearTimeout(init.inactivityTimer);
    init.inactivityTimer = undefined;
    finishRrweb(() => {
      this.stopAttempt(attempt);
      if (this.active(init) && init.lease === lease && init.recorder.phase === 'paused') {
        this.pushLifecycle(init, lease, pausedEvent);
      }
    });
  }

  private resume(init: Initialization): void {
    const lease = init.lease;
    if (!lease || init.recorder.phase !== 'paused') {
      return;
    }
    try {
      captureMetas(this.metas, () => {
        if (!this.active(init) || init.lease !== lease || init.recorder.phase !== 'paused') {
          return;
        }
        if (this.eligibleSessionId() !== lease.state.sessionId || lease.ownership() !== 'owned') {
          this.reconcile(init);
          return;
        }
        this.startAttempt(init, lease, 'paused');
      });
    } catch (error) {
      this.logWarn('Failed to resume session replay', error);
    }
  }

  private pushLifecycle(init: Initialization, lease: RecordingLease, name: string): void {
    try {
      captureMetas(this.metas, () => {
        if (this.active(init) && init.lease === lease && this.eligibleSessionId() === lease.state.sessionId) {
          this.api.pushEvent(name, { recording_id: lease.state.recordingId }, undefined, { skipDedupe: true });
        }
      });
    } catch (error) {
      this.logWarn(`Failed to push ${name} event`, error);
    }
  }

  private trackInteractions(init: Initialization): void {
    if (init.removeInteractions || !(this.options.inactivityThresholdMs! > 0)) {
      return;
    }
    const interact = () => {
      if (!this.active(init)) {
        return;
      }
      if (init.recorder.phase === 'paused') {
        this.scheduleStart(init);
      } else if (init.recorder.phase === 'recording') {
        this.resetInactivityTimer(init);
      }
    };
    init.removeInteractions = () => {
      for (const name of interactionEvents) {
        document.removeEventListener(name, interact, { capture: true });
      }
    };
    for (const name of interactionEvents) {
      document.addEventListener(name, interact, { capture: true, passive: true });
    }
  }

  private resetInactivityTimer(init: Initialization): void {
    const threshold = this.options.inactivityThresholdMs;
    if (!threshold || threshold <= 0 || init.recorder.phase !== 'recording') {
      return;
    }
    clearTimeout(init.inactivityTimer);
    init.inactivityTimer = setTimeout(() => this.pause(init), threshold);
  }

  private removeInteractionTracking(init: Initialization): void {
    clearTimeout(init.inactivityTimer);
    init.inactivityTimer = undefined;
    const remove = init.removeInteractions;
    init.removeInteractions = undefined;
    remove?.();
  }

  private recordOptions(init: Initialization, attempt: RecorderAttempt): recordOptions<eventWithTime> {
    return {
      emit: (event) =>
        runInRrweb(() => {
          if (!this.ownsAttempt(init, attempt)) {
            return;
          }
          if (attempt.buffer) {
            attempt.buffer.push(event);
          } else {
            this.handleEvent(init, attempt, event);
          }
        }),
      checkoutEveryNms: 300_000,
      recordCrossOriginIframes: this.options.recordCrossOriginIframes,
      maskAllInputs: this.options.maskAllInputs,
      maskInputOptions: this.options.maskInputOptions,
      maskInputFn: (text, element) =>
        runInRrweb(() =>
          this.ownsAttempt(init, attempt) ? this.options.maskInputFn!(text, element) : defaultMaskInputFn(text, element)
        ),
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
      errorHandler: (error) =>
        runInRrweb(() => {
          if (this.ownsAttempt(init, attempt)) {
            this.logError('Error occurred during session replay', error);
          }
        }),
    };
  }

  private sanitizeMetaHref(event: eventWithTime): void {
    if (event.type !== EventType.Meta || this.options.sanitizeMetaHref === false) {
      return;
    }
    const data = event.data;
    if (!data || typeof data !== 'object' || !('href' in data) || typeof data.href !== 'string') {
      return;
    }
    try {
      const url = new URL(data.href);
      url.username = '';
      url.password = '';
      url.search = '';
      url.hash = '';
      data.href = url.href;
    } catch {
      // Preserve malformed URLs rather than corrupting the event.
    }
  }

  private handleEvent(init: Initialization, attempt: RecorderAttempt, event: eventWithTime): void {
    try {
      captureMetas(this.metas, () => {
        if (!this.currentAttempt(init, attempt)) {
          return;
        }
        this.sanitizeMetaHref(event);
        const processed = this.options.beforeSend ? this.options.beforeSend(event) : event;
        if (!processed) {
          return;
        }
        this.sanitizeMetaHref(processed);
        if (!this.currentAttempt(init, attempt)) {
          return;
        }
        const reservation = attempt.lease.reserve(processed.type === EventType.Meta);
        if (!reservation) {
          this.endLease(init);
          this.scheduleStart(init);
          return;
        }
        const serialized = JSON.stringify(processed);
        if (!this.currentAttempt(init, attempt)) {
          return;
        }
        this.api.pushEvent(replayEvent, {
          event: serialized,
          recording_id: reservation.recordingId,
          gen: String(reservation.gen),
          seq: String(reservation.seq),
        });
      });
    } catch (error) {
      this.logWarn(`Failed to push ${replayEvent} event`, error);
    }
  }

  private register(init: Initialization, add: () => void, remove: () => void): void {
    if (!this.current(init)) {
      return;
    }
    init.disposers.push(remove);
    add();
    if (!this.current(init)) {
      remove();
    }
  }

  destroy(): void {
    const init = this.initialization;
    if (!init) {
      return;
    }
    this.initialization = undefined;
    init.startTask = undefined;
    init.unregisterProducer();
    this.cancelAcquisition(init);
    this.endLease(init);
    for (const dispose of init.disposers) {
      try {
        dispose();
      } catch (error) {
        this.logWarn('Failed to dispose session replay resource', error);
      }
    }
  }
}
