import type { BodyKey } from './types';

export enum TransportItemType {
  EXCEPTION = 'exception',
  LOG = 'log',
  MEASUREMENT = 'measurement',
  TRACE = 'trace',
  EVENT = 'event',
}

export const transportItemTypeToBodyKey: Record<TransportItemType, BodyKey> = {
  [TransportItemType.EXCEPTION]: 'exceptions',
  [TransportItemType.LOG]: 'logs',
  [TransportItemType.MEASUREMENT]: 'measurements',
  [TransportItemType.TRACE]: 'traces',
  [TransportItemType.EVENT]: 'events',
} as const;
