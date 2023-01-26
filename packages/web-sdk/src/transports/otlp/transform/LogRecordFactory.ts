import { TransportItemType } from 'packages/core/src/transports';
import { ErrorLogRecord } from './ErrorLogRecord';
import { EventLogRecord } from './EventLogRecord';
import { LogLogRecord } from './LogLogRecord';
import { MeasurementLogRecord } from './MeasurementLogRecord';

import type { LogTransportItem } from './types';

export type LogRecord = LogLogRecord | ErrorLogRecord | EventLogRecord | MeasurementLogRecord;

export class LogRecordFactory {
  static getLogRecord(item: LogTransportItem): LogRecord {
    const { type } = item;

    switch (type) {
      case TransportItemType.LOG:
        return new LogLogRecord(item);
      case TransportItemType.EXCEPTION:
        return new ErrorLogRecord(item);
      case TransportItemType.EVENT:
        return new EventLogRecord(item);
      case TransportItemType.MEASUREMENT:
        return new MeasurementLogRecord(item);
      default:
        throw new Error(`Unknown TransportItemType: ${type}`);
    }
  }
}
