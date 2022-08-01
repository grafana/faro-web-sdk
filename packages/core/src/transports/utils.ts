import { TransportItemType, transportItemTypeToBodyKey } from './const';
import type { TransportBody, TransportItem } from './types';

export function getTransportBody(item: TransportItem): TransportBody {
  return {
    [transportItemTypeToBodyKey[item.type]]: item.type === TransportItemType.TRACE ? item.payload : [item.payload],
    meta: item.meta,
  };
}
