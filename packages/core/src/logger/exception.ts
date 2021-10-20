import type { Meta } from '../meta';
import { TransportItemType } from '../transports';
import type { TransportItem, Transports } from '../transports';
import { getCurrentTimestamp } from '../utils/getCurrentTimestamp';

export interface ExceptionEvent {
  timestamp: string;
  type: string;
  value: string;

  stacktrace?: {
    frames: ExceptionStackFrame[];
  };
}

export interface ExceptionStackFrame {
  filename: string;
  function: string;

  colno?: number;
  lineno?: number;
}

export interface LoggerException {
  pushException: (value: string, type?: string, stackFrames?: any[]) => void;
}

export function initializeLoggerException(transports: Transports, meta: Meta): LoggerException {
  const pushException: LoggerException['pushException'] = (value, type = 'Error', stackFrames = []) => {
    try {
      const item: TransportItem<ExceptionEvent> = {
        meta: meta.values,
        payload: {
          type,
          value,
          timestamp: getCurrentTimestamp(),
        },
        type: TransportItemType.EXCEPTIONS,
      };

      if (stackFrames.length > 0) {
        item.payload.stacktrace = {
          frames: stackFrames,
        };
      }

      transports.execute(item);
    } catch (err) {}
  };

  return {
    pushException,
  };
}
