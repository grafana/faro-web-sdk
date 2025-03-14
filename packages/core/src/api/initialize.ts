import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import { faro } from '../sdk';
import { type TransportItem, TransportItemType, type Transports } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';
import { Observable } from '../utils';

import { EventEvent, initializeEventsAPI } from './events';
import { initializeExceptionsAPI } from './exceptions';
import { ItemBuffer } from './ItemBuffer';
import { initializeLogsAPI } from './logs';
import { initializeMeasurementsAPI } from './measurements';
import { initializeMetaAPI } from './meta';
import { initializeTracesAPI } from './traces';
import type { API, ApiMessageBusMessages } from './types';

export const apiMessageBus = new Observable<ApiMessageBusMessages>();

export function initializeAPI(
  unpatchedConsole: UnpatchedConsole,
  internalLogger: InternalLogger,
  config: Config,
  metas: Metas,
  transports: Transports
): API {
  internalLogger.debug('Initializing API');

  const { actionBuffer, getMessage } = createUserActionLifecycleHandler(transports);

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

function createUserActionLifecycleHandler(transports: Transports) {
  const actionBuffer = new ItemBuffer<TransportItem>();

  let message: ApiMessageBusMessages | undefined;

  apiMessageBus.subscribe((msg) => {
    if (msg.type === 'user-action-start') {
      message = msg;
      return;
    }

    if (msg.type === 'user-action-end') {
      const { duration, endTime, id, name, startTime, eventType } = msg;

      // Faro API is available at this point
      // Send the final action parent event
      faro.api.pushEvent(
        `user-action-${name}`,
        {
          action: 'user-action',
        },
        undefined,
        { timestampOverwriteMs: startTime }
      );

      actionBuffer.flushBuffer((item) => {
        let isUserActionEvent = false;

        if (isEventPayload(item) && item.payload.attributes?.['action'] === 'user-action') {
          isUserActionEvent = true;
          delete item.payload.attributes['action'];
        }

        const _item = {
          ...item,
          payload: {
            ...item.payload,
            action: {
              // children have parentId and the parent "user action" event has id
              ...(isUserActionEvent ? { id } : { parentId: id }),
              name,
            },
            ...(isUserActionEvent
              ? {
                  attributes: {
                    ...((item as TransportItem<EventEvent>).payload.attributes || {}),
                    userActionStartTime: startTime.toString(),
                    userActionEndTime: endTime.toString(),
                    userActionDuration: duration.toString(),
                    userActionEventType: eventType,
                  },
                }
              : {}),
          },
        } as TransportItem;

        transports.execute(_item);
      });

      message = undefined;
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
  return { actionBuffer, getMessage };
}

function isEventPayload(item: TransportItem): item is TransportItem<EventEvent> {
  return item.type === TransportItemType.EVENT;
}
