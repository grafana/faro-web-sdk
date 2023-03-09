import { deepEqual, InternalLogger, Meta, TransportItem, TransportItemType } from '@grafana/faro-core';

import { initLogsTransform, LogsTransform } from './transform';
import type { ResourceLog } from './transform';
import type { OtelTransportPayload } from './types';

interface ResourceLogsMetaMap {
  resourceLog: ResourceLog;
  meta: Meta;
}

export class OtelPayload {
  private resourceLogsWithMetas = [] as ResourceLogsMetaMap[];
  private initLogsTransform: LogsTransform;

  constructor(private internalLogger: InternalLogger, transportItem?: TransportItem) {
    this.internalLogger = internalLogger;

    this.initLogsTransform = initLogsTransform(this.internalLogger);

    if (transportItem) {
      this.addResourceItem(transportItem);
    }
  }

  getPayload(): OtelTransportPayload {
    return {
      resourceLogs: this.resourceLogsWithMetas.map(({ resourceLog }) => resourceLog),
      resourceSpans: [],
    } as const;
  }

  addResourceItem(transportItem: TransportItem): void {
    const { type, meta } = transportItem;
    const { toLogRecord, toResourceLog } = this.initLogsTransform;

    try {
      switch (type) {
        case TransportItemType.LOG:
        case TransportItemType.EXCEPTION:
        case TransportItemType.EVENT:
        case TransportItemType.MEASUREMENT:
          const resourceLogWithMeta = this.resourceLogsWithMetas.find(({ meta }) =>
            deepEqual(transportItem.meta, meta)
          );

          if (resourceLogWithMeta) {
            const { resourceLog } = resourceLogWithMeta;
            // Currently the scope is fixed to '@grafana/faro-web-sdk'.
            // Once we are able to drive the scope by instrumentation this will change and we need to align this function
            resourceLog.scopeLogs[0]?.logRecords.push(toLogRecord(transportItem));
          } else {
            this.resourceLogsWithMetas.push({
              resourceLog: toResourceLog(transportItem),
              meta,
            });
          }

          break;
        case TransportItemType.TRACE:
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
