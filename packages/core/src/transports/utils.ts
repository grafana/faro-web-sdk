import { TransportBody, TransportItemType } from './types';
import type { TransportItem } from './types';

const transportItemTypeToBodyKey: { [label in TransportItemType]: string } = {
  [TransportItemType.EXCEPTION]: 'exceptions',
  [TransportItemType.LOG]: 'logs',
  [TransportItemType.MEASUREMENT]: 'measurements',
  [TransportItemType.TRACE]: 'traces',
};

export function getTransportBody(item: TransportItem): TransportBody {
  return {
    [transportItemTypeToBodyKey[item.type]]: item.type === TransportItemType.TRACE ? item.payload : [item.payload],
    meta: item.meta,
  };
}
