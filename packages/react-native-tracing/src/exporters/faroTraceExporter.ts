import { ExportResultCode } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';
import { createExportTraceServiceRequest } from '@opentelemetry/otlp-transformer/build/src/trace/internal';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

import { createInternalLogger } from '@grafana/faro-core';

import type { FaroTraceExporterConfig } from '../types';

import { sendFaroEvents } from './faroTraceExporter.utils';

const internalLogger = createInternalLogger();

/**
 * FaroTraceExporter for React Native
 *
 * Exports OpenTelemetry spans to Faro backend using pushTraces API.
 *
 * IMPORTANT: To avoid infinite loops:
 * - Uses internalLogger instead of console
 * - Does NOT log during export (except errors)
 * - Relies on Faro's internal deduplication
 */
export class FaroTraceExporter implements SpanExporter {
  private _isShutdown = false;

  constructor(private config: FaroTraceExporterConfig) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    if (this._isShutdown) {
      internalLogger.error('FaroTraceExporter: Cannot export spans, exporter is shut down');
      resultCallback({ code: ExportResultCode.FAILED });
      return;
    }

    try {
      // Convert spans to OTLP format
      const traceEvent = createExportTraceServiceRequest(spans, { useHex: true, useLongBits: false });

      // Send traces to Faro
      this.config.api.pushTraces(traceEvent);

      // Send Faro events for CLIENT spans (HTTP requests, etc.)
      // This is done WITHOUT logging to avoid infinite loops
      sendFaroEvents(traceEvent.resourceSpans);

      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      // Only log critical errors
      internalLogger.error('FaroTraceExporter: Failed to export spans', error);
      resultCallback({ code: ExportResultCode.FAILED });
    }
  }

  async shutdown(): Promise<void> {
    this._isShutdown = true;
    return Promise.resolve(undefined);
  }

  async forceFlush(): Promise<void> {
    // No-op for now - spans are sent immediately via pushTraces
    return Promise.resolve(undefined);
  }
}
