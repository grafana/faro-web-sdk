import type { eventWithTime } from '@rrweb/types';
import { record, type recordOptions } from 'rrweb';

import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { defaultReplayInstrumentationOptions } from './const';
import type { ReplayInstrumentationOptions } from './types';

const faroSessionReplayEventName = 'faro.session_recording.event';

export class ReplayInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-instrumentation-replay';
  readonly version = VERSION;

  private stopFn: { (): void } | null = null;
  private isRecording: boolean = false;
  private options: ReplayInstrumentationOptions = defaultReplayInstrumentationOptions;

  constructor(options: ReplayInstrumentationOptions = {}) {
    super();

    this.options = {
      ...defaultReplayInstrumentationOptions,
      ...options,
    };
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
    let rate = this.options.samplingRate ?? 1;
    if (rate < 0 || rate > 1) {
      const clamped = Math.min(1, Math.max(0, rate));
      this.logDebug(`samplingRate ${rate} is out of range [0, 1], clamping to ${clamped}`);
      rate = clamped;
    }
    if (rate === 0) {
      return false;
    }
    if (rate === 1) {
      return true;
    }
    return this.hashSessionId(sessionId) < rate;
  }

  // Produces a deterministic float in [0, 1] from a session ID string so that the
  // replay sampling decision is stable across page reloads for the same session.
  private hashSessionId(sessionId: string): number {
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
    }
    return hash / 0xffffffff;
  }

  private stopRecording(): void {
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }
    this.isRecording = false;
    this.logDebug('Session replay stopped');
  }

  private startRecording(): void {
    try {
      const opts: recordOptions<eventWithTime> = {
        emit: (event: eventWithTime, isCheckout?: boolean): void => {
          this.handleEvent(event, isCheckout);
        },
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

      const stop = record(opts);
      if (stop) {
        this.stopFn = stop;
      }

      this.isRecording = true;
      this.logDebug('Session replay started');
    } catch (err) {
      this.logWarn('Failed to start session replay', err);
    }
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
