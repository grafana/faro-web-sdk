import { ExportResultCode } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';
import { JsonTraceSerializer } from '@opentelemetry/otlp-transformer';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace';

import type { TraceEvent } from '@grafana/faro-web-sdk';

import { sendFaroEvents } from './faroTraceExporter.utils';
import type { FaroTraceExporterConfig } from './types';

export class FaroTraceExporter implements SpanExporter {
  constructor(private config: FaroTraceExporterConfig) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const traceEvent: TraceEvent = JSON.parse(new TextDecoder().decode(JsonTraceSerializer.serializeRequest(spans)));

    this.config.api.pushTraces(traceEvent);
    sendFaroEvents(traceEvent.resourceSpans, this.config.api);

    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  shutdown(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
