import type { ApiHandlerPayload } from '../api';
import { config } from '../config';
import { getMetaValues } from '../meta';
import type { ExceptionEvent } from './exception';
import type { LogEvent } from './log';
import type { TraceEvent } from './trace';

export enum LoggerBufferItemType {
  LOGS = 'logs',
  EXCEPTIONS = 'exceptions',
  TRACES = 'traces',
}

export type LoggerBufferItemPayload = LogEvent | ExceptionEvent | TraceEvent;

export interface LoggerBufferItem {
  type: LoggerBufferItemType;
  payload: LoggerBufferItemPayload;
}

export type LoggerBuffer = LoggerBufferItem[];

export let buffer: LoggerBuffer = [];

export let timeoutId: ReturnType<typeof setTimeout> | null = null;

export function getBufferCopy(): LoggerBuffer {
  // TODO: implement a better way to deep copy the buffer
  return JSON.parse(JSON.stringify(buffer));
}

export function clearTimeoutId(): void {}

export function drain(): void {
  clearTimeoutId();

  // TODO: Set correct timeout interval
  timeoutId = setTimeout(() => {
    const payload = buffer.reduce(
      (acc, item) => {
        acc[item.type].push(item.payload as LogEvent & ExceptionEvent);

        return acc;
      },
      {
        [LoggerBufferItemType.LOGS]: [],
        [LoggerBufferItemType.EXCEPTIONS]: [],
        [LoggerBufferItemType.TRACES]: [],
      } as ApiHandlerPayload
    );

    const enhancedPayload: ApiHandlerPayload = {
      ...payload,
      meta: {
        ...getMetaValues(),
        ...(payload.meta ?? {}),
      },
    };

    config.apiHandlers.forEach((apiHandler) => {
      apiHandler(enhancedPayload);
    });

    buffer = [];

    timeoutId = null;
  }, 2000);
}

export function pushEvent(type: LoggerBufferItemType, payload: LoggerBufferItemPayload): void {
  clearTimeoutId();

  buffer.push({
    type,
    payload,
  });

  drain();
}
