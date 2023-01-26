import type { ExceptionEvent, EventEvent, LogEvent, MeasurementEvent } from 'packages/core/src/api';
import { TransportItem, TransportItemType } from 'packages/core/src/transports';
import { ErrorLogRecord } from './ErrorLogRecord';
import { EventLogRecord } from './EventLogRecord';
import { LogLogRecord } from './LogLogRecord';
import { MeasurementLogRecord } from './MeasurementLogRecord';

import type { LogTransportItem } from './types';

export type LogRecord = LogLogRecord | ErrorLogRecord | EventLogRecord | MeasurementLogRecord;

export class LogRecordFactory {
  static getNewLogRecord(item: LogTransportItem): LogRecord {
    if (isLogEventTransport(item)) {
      return new LogLogRecord(item);
    }
    if (isExceptionEventTransport(item)) {
      return new ErrorLogRecord(item);
    }
    if (isEventEventTransport(item)) {
      return new EventLogRecord(item);
    }
    if (isMeasurementEventTransport(item)) {
      return new MeasurementLogRecord(item);
    }

    throw new Error(`Unknown TransportItemType: ${item.type}`);
  }
}

function isLogEventTransport(item: LogTransportItem): item is TransportItem<LogEvent> {
  return item.type === TransportItemType.LOG;
}

function isExceptionEventTransport(item: LogTransportItem): item is TransportItem<ExceptionEvent> {
  return item.type === TransportItemType.EXCEPTION;
}

function isEventEventTransport(item: LogTransportItem): item is TransportItem<EventEvent> {
  return item.type === TransportItemType.EVENT;
}

function isMeasurementEventTransport(item: LogTransportItem): item is TransportItem<MeasurementEvent> {
  return item.type === TransportItemType.MEASUREMENT;
}
