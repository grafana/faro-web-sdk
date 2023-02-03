import { Meta, TransportItem, TransportItemType } from '@grafana/faro-core';
import { getResourceLogPayload, getScopeLog } from './transform/transform';
import { internalLogger } from '../otlpPayloadLogger';

import type { ResourceLogPayload } from './transform';

interface ResourceLogsMetaMap {
  resourceLog: ResourceLogPayload;
  meta: Meta;
}

export class OtelPayload {
  private resourceLogsWithMetas = [] as ResourceLogsMetaMap[];

  constructor(private transportItem?: TransportItem) {
    if (this.transportItem) {
      this.resourceLogsWithMetas.push({
        resourceLog: getResourceLogPayload(this.transportItem),
        meta: this.transportItem.meta,
      });
    }
  }

  public getPayload() {
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
        // TODO: implement trace transform
        break;
      default:
        internalLogger.error(`Unknown TransportItemType: ${type}`);
        break;
    }
  }
}
