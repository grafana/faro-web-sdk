import { TransportItemType } from '@grafana/faro-core';
import type { InternalLogger, TraceEvent, TransportItem } from '@grafana/faro-core';

import type { OtlpHttpTransportOptions } from '../types';

import { getLogTransforms, getTraceTransforms } from './transform';
import type { LogsTransform, TraceTransform } from './transform';
import type { ResourceLogs, ResourceSpans } from './transform/types';
import type { OtelTransportPayload } from './types';

type OtelPayloadParams = {
  internalLogger: InternalLogger;
  transportItem?: TransportItem;
  customOtlpTransform?: OtlpHttpTransportOptions['otlpTransform'];
};

export class OtelPayload {
  private resourceLogs: ResourceLogs;
  private resourceSpans = [] as ResourceSpans;

  private getLogTransforms: LogsTransform;
  private getTraceTransforms: TraceTransform;

  private internalLogger: InternalLogger;

  constructor({ internalLogger, customOtlpTransform, transportItem }: OtelPayloadParams) {
    this.internalLogger = internalLogger;
    this.resourceLogs = [];

    this.getLogTransforms = getLogTransforms(this.internalLogger, customOtlpTransform);
    this.getTraceTransforms = getTraceTransforms(this.internalLogger);

    if (transportItem) {
      this.addResourceItem(transportItem);
    }
  }

  getPayload(): OtelTransportPayload {
    return {
      resourceLogs: this.resourceLogs,
      resourceSpans: this.resourceSpans,
    } as const;
  }

  addResourceItem(transportItem: TransportItem): void {
    const { type } = transportItem;

    try {
      switch (type) {
        case TransportItemType.LOG:
        case TransportItemType.EXCEPTION:
        case TransportItemType.EVENT:
        case TransportItemType.MEASUREMENT: {
          const { toLogRecord, toResourceLog } = this.getLogTransforms;

          // Currently the scope is fixed to '@grafana/faro-web-sdk'.
          // Once we are able to drive the scope by instrumentation this will change and we need to align this function
          if (this.resourceLogs.length === 0) {
            this.resourceLogs = [toResourceLog(transportItem)];
          } else {
            // Faro takes care of the grouping with different metadata (or OTel attributes), so we can safely
            // use the just the first element of the resource.
            this.resourceLogs[0]?.scopeLogs[0]?.logRecords.push(toLogRecord(transportItem));
          }
          break;
        }
        case TransportItemType.TRACE: {
          const { toResourceSpan } = this.getTraceTransforms;

          // We use the Otel Model as it is to avoid unnecessary resource consumption.
          // This is because we don't need the same logic to add items as it is for logs.
          // Also the Otel library already applies the respective protocol transforms so there is no need for additional transforms.
          // We only transform the resource object to ensure that we are compliant with the respective Faro Metas which add a few more items to the resource object.
          this.resourceSpans.push(toResourceSpan(transportItem as TransportItem<TraceEvent>));

          break;
        }
        default:
          this.internalLogger?.error(`Unknown TransportItemType: ${type}`);
          break;
      }
    } catch (error) {
      this.internalLogger?.error(error);
    }
  }
}
