import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import { type TransportItem, TransportItemType, type Transports } from '../transports';
import type { UnpatchedConsole } from '../unpatchedConsole';
import { Observable } from '../utils';

import { initializeEventsAPI } from './events';
import { initializeExceptionsAPI } from './exceptions';
import { ItemBuffer } from './ItemBuffer';
import { initializeLogsAPI } from './logs';
import { initializeMeasurementsAPI, MeasurementEvent } from './measurements';
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
      const { id, name } = msg;

      actionBuffer.flushBuffer((item) => {
        if (item.type === TransportItemType.MEASUREMENT && (item.payload as MeasurementEvent).type === 'web-vitals') {
          transports.execute(item);
          return;
        }

        const _item = {
          ...item,
          payload: {
            ...item.payload,
            action: {
              parentId: id,
              name,
            },
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
        transports.execute(item);
      });
    }
  });

  const getMessage = (): typeof message => message;
  return { actionBuffer, getMessage };
}
