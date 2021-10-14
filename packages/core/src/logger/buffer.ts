import { ApiPayloadItems, sendRequest } from '../api';
import type { ApiPayload } from '../api';
import type { ExceptionEvent } from './exception';
import type { LogEvent } from './log';

export type LoggerBuffer = Omit<ApiPayload, 'meta'>;

export const buffer: LoggerBuffer = {
  logs: [],
  exceptions: [],
};

export let timeoutId: ReturnType<typeof setTimeout> | null = null;

export function getBuffer(): LoggerBuffer {
  return buffer;
}

export function pushEvent(type: ApiPayloadItems, payload: LogEvent | ExceptionEvent): void {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  buffer[type].push(payload as LogEvent & ExceptionEvent);

  // TODO: Set correct timeout interval
  timeoutId = setTimeout(() => {
    sendRequest(buffer);

    buffer.logs = [];
    buffer.exceptions = [];

    timeoutId = null;
  }, 2000);
}

export function pushLog(payload: LogEvent): void {
  pushEvent(ApiPayloadItems.LOG, payload);
}

export function pushException(payload: ExceptionEvent): void {
  pushEvent(ApiPayloadItems.EXCEPTION, payload);
}
