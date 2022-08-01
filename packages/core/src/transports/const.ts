export enum TransportItemType {
  EXCEPTION = 'exception',
  LOG = 'log',
  MEASUREMENT = 'measurement',
  TRACE = 'trace',
}

export const transportItemTypeToBodyKey: Record<TransportItemType, string> = {
  [TransportItemType.EXCEPTION]: 'exceptions',
  [TransportItemType.LOG]: 'logs',
  [TransportItemType.MEASUREMENT]: 'measurements',
  [TransportItemType.TRACE]: 'traces',
} as const;
