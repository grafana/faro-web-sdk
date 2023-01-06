import { ExportResultCode } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';
import { createExportTraceServiceRequest } from '@opentelemetry/otlp-transformer';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

import type { FaroTraceExporterConfig } from './types';

export class FaroTraceExporter implements SpanExporter {
  constructor(private config: FaroTraceExporterConfig) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const traceEvent = createExportTraceServiceRequest(spans, true);

    this.config.api.pushTraces(traceEvent);

    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  shutdown(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
