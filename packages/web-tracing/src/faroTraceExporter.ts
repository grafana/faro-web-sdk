import { ExportResultCode } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';
import { JSON_ENCODER } from '@opentelemetry/otlp-transformer/build/src/common/utils';
import { createExportTraceServiceRequest } from '@opentelemetry/otlp-transformer/build/src/trace/internal';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-web';

import type { Meta } from '@grafana/faro-web-sdk';

import { spanMetas } from './faroMetaAttributesSpanProcessor';
import { sendFaroEvents } from './faroTraceExporter.utils';
import type { FaroTraceExporterConfig } from './types';

export class FaroTraceExporter implements SpanExporter {
  constructor(private config: FaroTraceExporterConfig) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const groups = new Map<string | undefined, { meta: Meta | undefined; spans: ReadableSpan[] }>();
    for (const span of spans) {
      const meta = spanMetas.get(span);
      if (meta === null) {
        continue;
      }
      const key = JSON.stringify(meta);
      let group = groups.get(key);
      if (!group) {
        group = { meta, spans: [] };
        groups.set(key, group);
      }
      group.spans.push(span);
    }
    for (const { meta, spans } of groups.values()) {
      const traceEvent = createExportTraceServiceRequest(spans, JSON_ENCODER);
      this.config.api.pushTraces(traceEvent, { meta });
      sendFaroEvents(traceEvent.resourceSpans, this.config.api, meta);
    }

    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  shutdown(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
