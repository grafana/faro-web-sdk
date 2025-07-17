import type { eventWithTime } from '@rrweb/types';
import { record, type recordOptions } from 'rrweb';

import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import type { SessionRecordingInstrumentationOptions } from './types';

export class SessionRecordingInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-session-recording';
  readonly version = VERSION;

  private stopFn: any = null;
  private eventBuffer: eventWithTime[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private isRecording = false;
  private options: SessionRecordingInstrumentationOptions;

  constructor(options: SessionRecordingInstrumentationOptions = {}) {
    super();

    this.options = {
      batchSize: 100,
      batchTimeout: 10000,
      sampling: false,
      samplingRate: 0.1,
      recordCrossOriginIframes: false,
      maskTextInputs: true,
      maskAllInputs: false,
      collectFonts: false,
      inlineImages: false,
      inlineStylesheet: false,
      recordCanvas: false,
      ...options,
    };
  }

  initialize(): void {
    if (this.isRecording) {
      return;
    }

    // Check if sampling is enabled and if we should record this session
    if (this.options.sampling && Math.random() > (this.options.samplingRate || 0.1)) {
      this.logDebug('Session recording skipped due to sampling');
      return;
    }

    this.startRecording();
  }

  private startRecording(): void {
    try {
      const opts: recordOptions<eventWithTime> = {
        emit: (event: eventWithTime) => {
          this.handleEvent(event);
        },
        checkoutEveryNth: 100,
        checkoutEveryNms: 300000, // 5 minutes
        recordCrossOriginIframes: this.options.recordCrossOriginIframes,
        maskAllInputs: this.options.maskAllInputs,
        maskInputOptions: {
          password: true,
          text: this.options.maskTextInputs,
        },
        slimDOMOptions: {
          script: true,
          comment: true,
        },
        recordCanvas: this.options.recordCanvas,
        collectFonts: this.options.collectFonts,
        inlineImages: this.options.inlineImages,
        inlineStylesheet: this.options.inlineStylesheet,
      };

      if (this.options.maskSelector) {
        opts.maskTextSelector = this.options.maskSelector;
      }
      if (this.options.blockSelector) {
        opts.blockSelector = this.options.blockSelector;
      }
      if (this.options.ignoreSelector) {
        opts.ignoreSelector = this.options.ignoreSelector;
      }

      this.stopFn = record(opts);

      this.isRecording = true;
      this.logDebug('Session recording started');
    } catch (err) {
      this.logWarn('Failed to start session recording', err);
    }
  }

  private handleEvent(event: eventWithTime): void {
    try {
      // Apply beforedecord filter if provided
      if (this.options.beforeRecord && !this.options.beforeRecord(event)) {
        return;
      }

      // Apply beforeSend transformation if provided
      let processedEvent = event;
      if (this.options.beforeSend) {
        processedEvent = this.options.beforeSend(event);
        if (!processedEvent) {
          return;
        }
      }

      this.eventBuffer.push(processedEvent);

      // Check if we should send the batch
      if (this.eventBuffer.length >= (this.options.batchSize || 100)) {
        this.sendBatch();
      } else if (!this.batchTimeout) {
        // Set timeout for next batch
        this.batchTimeout = setTimeout(() => {
          this.sendBatch();
        }, this.options.batchTimeout || 10000);
      }
    } catch (err) {
      this.logWarn('Error processing session recording event', err);
    }
  }

  private sendBatch(): void {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = this.eventBuffer.splice(0);

    // Clear timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    try {
      this.api.pushEvent('session_recording_batch', {
        events: JSON.stringify(
          events.map((event) => ({
            timestamp: event.timestamp,
            delay: event.delay,
            type: event.type,
            data: event.data,
          }))
        ),
        batchSize: events.length.toString(),
        sessionId: this.api.getSession()?.id || '',
      });
    } catch (err) {
      this.logWarn('Error sending session recording batch', err);
    }
  }

  destroy(): void {
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Send any remaining events
    if (this.eventBuffer.length > 0) {
      this.sendBatch();
    }

    this.isRecording = false;
    this.logDebug('Session recording stopped');
  }
}
