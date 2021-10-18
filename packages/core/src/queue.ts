import type { ApiHandlerPayload } from './api';
import { config } from './config';
import type { ExceptionEvent, LogEvent, TraceEvent } from './logger';
import { getMetaValues } from './meta';

export enum QueueItemType {
  LOGS = 'logs',
  EXCEPTIONS = 'exceptions',
  TRACES = 'traces',
}

export type QueueItemPayload = LogEvent | ExceptionEvent | TraceEvent;

export interface QueueItem {
  type: QueueItemType;
  payload: QueueItemPayload;
}

export type Queue = QueueItem[];

export let queue: Queue = [];

export let timeoutId: ReturnType<typeof setTimeout> | null = null;

export function getQueueCopy(): Queue {
  // TODO: implement a better way to deep copy the queue
  return JSON.parse(JSON.stringify(queue));
}

export function clearTimeoutId(): void {}

export function drain(): void {
  clearTimeoutId();

  // TODO: Set correct timeout interval
  timeoutId = setTimeout(() => {
    const payload = queue.reduce(
      (acc, item) => {
        acc[item.type].push(item.payload as LogEvent & ExceptionEvent);

        return acc;
      },
      {
        [QueueItemType.LOGS]: [],
        [QueueItemType.EXCEPTIONS]: [],
        [QueueItemType.TRACES]: [],
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

    queue = [];

    timeoutId = null;
  }, 2000);
}

export function pushEvent(type: QueueItemType, payload: QueueItemPayload): void {
  clearTimeoutId();

  queue.push({
    type,
    payload,
  });

  drain();
}
