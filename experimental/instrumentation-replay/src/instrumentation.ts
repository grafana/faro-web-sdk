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
    if (this.isRecording) {
      this.logWarn('Session replay is already running');
      return;
    }

    this.startRecording();
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
        maskTextSelector: this.options.maskTextSelector,
        blockSelector: this.options.blockSelector,
        ignoreSelector: this.options.ignoreSelector,
        recordCanvas: this.options.recordCanvas,
        collectFonts: this.options.collectFonts,
        inlineImages: this.options.inlineImages,
        recordDOM: true,
        inlineStylesheet: this.options.inlineStylesheet,
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
      let processedEvent = event;
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
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }

    this.isRecording = false;
    this.logDebug('Session replay stopped');
  }
}
