import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import type { TransportItem, Transports } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';
import { isFunction, Observable } from '../utils';

import { EventEvent, initializeEventsAPI } from './events';
import { initializeExceptionsAPI } from './exceptions';
import { initializeLogsAPI } from './logs';
import { initializeMeasurementsAPI } from './measurements';
import { initializeMetaAPI } from './meta';
import { initializeTracesAPI } from './traces';
import type { API, ApiMessageBusMessage } from './types';

export const apiMessageBus = new Observable<ApiMessageBusMessage>();

export function initializeAPI(
  unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  config: Config,
  metas: Metas,
  transports: Transports
): API {
  internalLogger.debug('Initializing API');

  const actionBuffer = new ItemBuffer<TransportItem>();

  let message: ApiMessageBusMessage | undefined;

  apiMessageBus.subscribe((msg) => {
    if (msg.type === 'user-action-start') {
      message = msg;
      return;
    }

    if (msg.type === 'user-action-end') {
      const thisMessage = msg;
      message = undefined;
      actionBuffer.flushBuffer((item) => {
        const _item = {
          ...item,
          payload: {
            ...item.payload,
            action: {
              name: thisMessage.name,
              parentId: thisMessage.parentId,
              id: thisMessage.id,
            },
          },
        } as TransportItem<EventEvent>;

        transports.execute(_item);
      });
      return;
    }

    if (msg.type === 'user-action-cancel') {
      message = undefined;
      actionBuffer.flushBuffer((item) => {
        // TODO: filter unrelated and user defined signals.
        transports.execute(item);
      });
    }
  });

  const getMessage = (): typeof message => message;

  const tracesApi = initializeTracesAPI(unpatchedConsole, internalLogger, config, metas, transports);

  const props = {
    unpatchedConsole,
    internalLogger,
    config,
    metas,
    transports,
    tracesApi,
    actionBuffer,
    getMessage,
  };

  return {
    ...tracesApi,
    ...initializeExceptionsAPI(props),
    ...initializeMetaAPI(props),
    ...initializeLogsAPI(props),
    ...initializeMeasurementsAPI(props),
    ...initializeEventsAPI(props),
  };
}

export class ItemBuffer<T> {
  private buffer: T[];

  constructor() {
    this.buffer = [];
  }

  addItem(item: T) {
    this.buffer.push(item);
  }

  flushBuffer(cb?: (item: T) => void) {
    if (isFunction(cb)) {
      for (const item of [...this.buffer]) {
        cb(item);
      }
    }

    this.buffer.length = 0;
  }
}
