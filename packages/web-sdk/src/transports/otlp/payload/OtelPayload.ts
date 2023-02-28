import { deepEqual, Meta, TransportItem, TransportItemType } from '@grafana/faro-core';

import { internalLogger } from '../otlpPayloadLogger';

import { toResourceLog, toScopeLog } from './transform';
import type { ResourceLog } from './transform';
import type { OtelTransportPayload } from './types';

interface ResourceLogsMetaMap {
  resourceLog: ResourceLog;
  meta: Meta;
}

export class OtelPayload {
  private resourceLogsWithMetas = [] as ResourceLogsMetaMap[];

  constructor(transportItem?: TransportItem) {
    if (transportItem) {
      this.addResourceItem(transportItem);
    }
  }

  getPayload(): OtelTransportPayload {
    return {
      resourceLogs: this.resourceLogsWithMetas.map(({ resourceLog }) => resourceLog),
      resourceSpans: [],
      resourceMetrics: [],
    } as const;
  }

  addResourceItem(transportItem: TransportItem): void {
    const { type, meta } = transportItem;

    switch (type) {
      case TransportItemType.LOG:
      case TransportItemType.EXCEPTION:
      case TransportItemType.EVENT:
      case TransportItemType.MEASUREMENT:
        const resourceLogWithMeta = this.resourceLogsWithMetas.find(({ meta }) => deepEqual(transportItem.meta, meta));

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
        internalLogger.error(`Unknown TransportItemType: ${type}`);
        break;
    }
  }
}
