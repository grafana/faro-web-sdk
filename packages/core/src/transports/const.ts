import type { BodyKey } from './types';

export const TransportItemType = {
  EXCEPTION: 'exception',
  LOG: 'log',
  MEASUREMENT: 'measurement',
  TRACE: 'trace',
  EVENT: 'event',
} as const;

export type TransportItemType = (typeof TransportItemType)[keyof typeof TransportItemType];

export const transportItemTypeToBodyKey: Record<TransportItemType, BodyKey> = {
  [TransportItemType.EXCEPTION]: 'exceptions',
  [TransportItemType.LOG]: 'logs',
  [TransportItemType.MEASUREMENT]: 'measurements',
  [TransportItemType.TRACE]: 'traces',
  [TransportItemType.EVENT]: 'events',
} as const;
