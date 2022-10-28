import { ExportResultCode } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';
import { createExportTraceServiceRequest } from '@opentelemetry/otlp-transformer';
import type { IExportTraceServiceRequest } from '@opentelemetry/otlp-transformer';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

import type { TraceEvent } from '@grafana/faro-core';

import type { FaroTraceExporterConfig } from './types';

export class FaroTraceExporter implements SpanExporter {
  constructor(private config: FaroTraceExporterConfig) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const traceEvent = exportTraceServiceRequestToTraceEvent(createExportTraceServiceRequest(spans, true));

    this.config.faro.api.pushTraces(traceEvent);

    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  shutdown(): Promise<void> {
    return Promise.resolve(undefined);
  }
}

// TODO: Revert temporary patching. See tracing/types for details
function exportTraceServiceRequestToTraceEvent({ resourceSpans, ...rest }: IExportTraceServiceRequest): TraceEvent {
  return {
    ...rest,
    resourceSpans: resourceSpans?.map(({ scopeSpans, ...rest }) => ({
      ...rest,
      instrumentationLibrarySpans: scopeSpans?.map(({ scope, ...rest }) => ({
        ...rest,
        instrumentationLibrary: scope,
      })),
    })),
  };
}
