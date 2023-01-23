import { deepEqual, InternalLogger, Meta, TransportItem, TransportItemType } from '@grafana/faro-core';

import { toResourceLog, toScopeLog } from './transform';
import type { ResourceLog } from './transform';
import type { OtelTransportPayload } from './types';

interface ResourceLogsMetaMap {
  resourceLog: ResourceLog;
  meta: Meta;
}

export class OtelPayload {
  private resourceLogsWithMetas = [] as ResourceLogsMetaMap[];

  constructor(transportItem?: TransportItem, private internalLogger?: InternalLogger) {
    this.internalLogger = internalLogger;

    if (transportItem) {
      this.addResourceItem(transportItem);
    }
  }

  getPayload(): OtelTransportPayload {
    return {
      resourceLogs: this.resourceLogsWithMetas.length
        ? this.resourceLogsWithMetas.map(({ resourceLog }) => resourceLog)
        : undefined,
    } as const;
  }

  addResourceItem(transportItem: TransportItem): void {
    const { type, meta } = transportItem;

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
            resourceLog.scopeLogs.push(toScopeLog(transportItem));
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
