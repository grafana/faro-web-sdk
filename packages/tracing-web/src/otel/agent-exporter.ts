import type { Agent } from '@grafana/agent-core';
import type { Attributes } from '@opentelemetry/api';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { toOTLPExportTraceServiceRequest } from '@opentelemetry/exporter-trace-otlp-http/build/esnext';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';

interface GrafanaAgentTraceExporterConfig {
  attributes?: Attributes;
  agent: Agent;
}

export class GrafanaAgentTraceExporter {
  attributes: Attributes;

  constructor(private config: GrafanaAgentTraceExporterConfig) {
    this.attributes = config.attributes ?? {};
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    // TODO: fix the "any" once @opentelemetry/otel-transforms is published to npm
    // it will have a version that does not need reference to exporter
    // only `attributes` property is used from this
    const request = toOTLPExportTraceServiceRequest(spans, this as any, true);
    this.config.agent.api.pushTraces(request);
    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  shutdown(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
