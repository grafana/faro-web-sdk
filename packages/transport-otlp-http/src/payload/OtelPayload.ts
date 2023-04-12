import { deepEqual, InternalLogger, TraceEvent, TransportItem, TransportItemType } from '@grafana/faro-core';

import { getLogTransforms, getTraceTransforms, LogsTransform, TraceTransform } from './transform';
import type { ResourceLogs } from './transform';
import type { ResourceMeta, ResourceSpans } from './transform/types';
import type { OtelTransportPayload } from './types';

interface ResourceLogsMetaMap {
  resourceLog: ResourceLogs;
  resourceMeta: ResourceMeta;
}

export class OtelPayload {
  private resourceLogsWithMetas = [] as ResourceLogsMetaMap[];
  private resourceSpans = [] as ResourceSpans[];

  private getLogTransforms: LogsTransform;
  private getTraceTransforms: TraceTransform;

  constructor(private internalLogger: InternalLogger, transportItem?: TransportItem) {
    this.internalLogger = internalLogger;

    this.getLogTransforms = getLogTransforms(this.internalLogger);
    this.getTraceTransforms = getTraceTransforms(this.internalLogger);

    if (transportItem) {
      this.addResourceItem(transportItem);
    }
  }

  getPayload(): OtelTransportPayload {
    return {
      resourceLogs: this.resourceLogsWithMetas.map(({ resourceLog }) => resourceLog),
      resourceSpans: this.resourceSpans,
    } as const;
  }

  addResourceItem(transportItem: TransportItem): void {
    const { type, meta } = transportItem;

    const currentItemResourceMeta: ResourceMeta = {
      browser: meta.browser,
      sdk: meta.sdk,
      app: meta.app,
    } as const;

    try {
      switch (type) {
        case TransportItemType.LOG:
        case TransportItemType.EXCEPTION:
        case TransportItemType.EVENT:
        case TransportItemType.MEASUREMENT:
          const { toLogRecord, toResourceLog } = this.getLogTransforms;

          const resourceLogWithMeta = this.resourceLogsWithMetas.find(({ resourceMeta }) =>
            deepEqual(currentItemResourceMeta, resourceMeta)
          );

          if (resourceLogWithMeta) {
            const { resourceLog } = resourceLogWithMeta;
            // Currently the scope is fixed to '@grafana/faro-web-sdk'.
            // Once we are able to drive the scope by instrumentation this will change and we need to align this function
            resourceLog.scopeLogs[0]?.logRecords.push(toLogRecord(transportItem));
          } else {
            this.resourceLogsWithMetas.push({
              resourceLog: toResourceLog(transportItem),
              resourceMeta: currentItemResourceMeta,
            });
          }

          break;
        case TransportItemType.TRACE:
          const { toResourceSpan } = this.getTraceTransforms;

          // We use the Otel Model as it is to avoid unnecessary resource consumption.
          // This is because we don't need the same logic to add items as it is for logs.
          // Also the Otel library already applies the respective protocol transforms so there is no need for additional transforms.
          // We only transform the resource object to ensure that we are compliant with the respective Faro Metas which add a few more items to the resource object.
          this.resourceSpans.push(toResourceSpan(transportItem as TransportItem<TraceEvent>));

          break;
        default:
          this.internalLogger?.error(`Unknown TransportItemType: ${type}`);
          break;
      }
    } catch (error) {
      this.internalLogger?.error(error);
    }
  }
}
