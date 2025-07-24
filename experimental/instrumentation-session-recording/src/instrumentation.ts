import type { eventWithTime } from '@rrweb/types';
import { record, type recordOptions } from 'rrweb';

import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import type { SessionRecordingInstrumentationOptions } from './types';

const faroSessionRecordingEventsBatch = 'faro.session_recording.events_batch';

export class SessionRecordingInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-session-recording';
  readonly version = VERSION;

  private stopFn: any = null;
  private isRecording = false;
  private options: SessionRecordingInstrumentationOptions;

  constructor(options: SessionRecordingInstrumentationOptions = {}) {
    super();

    this.options = {
      ...options,
    };
  }

  initialize(): void {
    if (this.isRecording) {
      this.logWarn('Session recording is already running');
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
        recordCrossOriginIframes: this.options.recordCrossOriginIframes,
        maskAllInputs: this.options.maskAllInputs,
        maskInputOptions: this.options.maskInputOptions,
        maskTextSelector: this.options.maskSelector,
        blockSelector: this.options.blockSelector,
        ignoreSelector: this.options.ignoreSelector,
        slimDOMOptions: {
          script: true,
          comment: true,
        },
        recordCanvas: this.options.recordCanvas,
        collectFonts: this.options.collectFonts,
        inlineImages: this.options.inlineImages,
        inlineStylesheet: this.options.inlineStylesheet,
        errorHandler: (err) => {
          this.logError('Error ocurred during session recording', err);
        },
      };

      this.stopFn = record(opts);

      this.isRecording = true;
      this.logDebug('Session recording started');
    } catch (err) {
      this.logWarn('Failed to start session recording', err);
    }
  }

  private handleEvent(event: eventWithTime, _?: boolean): void {
    try {
      // Apply beforeSend transformation if provided
      let processedEvent = event;
      if (this.options.beforeSend) {
        processedEvent = this.options.beforeSend(event);
        if (!processedEvent) {
          return;
        }
      }

      this.api.pushEvent(faroSessionRecordingEventsBatch, {
        event: JSON.stringify(event),
      });
    } catch (err) {
      this.logWarn(`Failed to push ${faroSessionRecordingEventsBatch} event`, err);
    }
  }

  destroy(): void {
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }

    this.isRecording = false;
    this.logDebug('Session recording stopped');
  }
}
