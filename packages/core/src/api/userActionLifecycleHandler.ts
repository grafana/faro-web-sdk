import { type TransportItem, TransportItemType, type Transports } from '../transports';
import type { Observable } from '../utils';

import { ItemBuffer } from './ItemBuffer';
import type { MeasurementEvent } from './measurements';
import type { APIEvent, ApiMessageBusMessages } from './types';

export function createUserActionLifecycleHandler(
  apiMessageBus: Observable<ApiMessageBusMessages>,
  transports: Transports
) {
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
        // Exclude web-vitals from user actions
        if (isExcludeFromUserAction(item)) {
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

function isExcludeFromUserAction(item: TransportItem<APIEvent>) {
  return item.type === TransportItemType.MEASUREMENT && (item.payload as MeasurementEvent).type === 'web-vitals';
}
