import { Meta, TransportItem, TransportItemType } from '@grafana/faro-core';
import { getResourceLogPayload, getScopeLog } from './transform/transform';
import { internalLogger } from '../otlpPayloadLogger';

import type { ResourceLogPayload } from './transform';
import type { OtelTransportPayload } from './types';

interface ResourceLogsMetaMap {
  resourceLog: ResourceLogPayload;
  meta: Meta;
}

export class OtelPayload {
  private resourceLogsWithMetas = [] as ResourceLogsMetaMap[];

  constructor(transportItem?: TransportItem) {
    if (transportItem) {
      this.addResourceItem(transportItem);
    }
  }

  public getPayload(): OtelTransportPayload {
    return {
      resourceLogs: this.resourceLogsWithMetas.map(({ resourceLog }) => resourceLog),
      resourceSpans: [],
    } as const;
  }

  addResourceItem(transportItem: TransportItem): void {
    const { type, meta } = transportItem;

    switch (type) {
      case TransportItemType.LOG:
      case TransportItemType.EXCEPTION:
      case TransportItemType.EVENT:
      case TransportItemType.MEASUREMENT:
        const resourceLogWithMeta = this.resourceLogsWithMetas.find(({ resourceLog }) => resourceLog);

        if (resourceLogWithMeta) {
          const { resourceLog } = resourceLogWithMeta;
          resourceLog.scopeLogs.push(getScopeLog(transportItem));
        } else {
          this.resourceLogsWithMetas.push({
            resourceLog: getResourceLogPayload(transportItem),
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
