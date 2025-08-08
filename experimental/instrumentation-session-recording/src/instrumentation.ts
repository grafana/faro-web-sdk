import type { eventWithTime } from '@rrweb/types';
import { record, type recordOptions } from 'rrweb';

import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import type { SessionRecordingInstrumentationOptions } from './types';
import { defaultSessionRecordingInstrumentationOptions } from './const';

const faroSessionRecordingEventName = 'faro.session_recording.event';

export class SessionRecordingInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-session-recording';
  readonly version = VERSION;

  private stopFn: { (): void } | null = () => {};
  private isRecording: boolean = false;
  private options: SessionRecordingInstrumentationOptions = defaultSessionRecordingInstrumentationOptions;

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
        // slimDOMOptions: {
        //   // script: true,
        //   comment: true,
        // },
        recordCanvas: this.options.recordCanvas,
        collectFonts: this.options.collectFonts,
        inlineImages: this.options.inlineImages,
        recordDOM: true,
        inlineStylesheet: this.options.inlineStylesheet,
        errorHandler: (err) => {
          this.logError('Error ocurred during session recording', err);
        },
      };

      const stop = record(opts);
      if (stop) {
        this.stopFn = stop;
      }

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

      this.api.pushEvent(faroSessionRecordingEventName, {
        event: JSON.stringify(processedEvent),
      });
    } catch (err) {
      this.logWarn(`Failed to push ${faroSessionRecordingEventName} event`, err);
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
