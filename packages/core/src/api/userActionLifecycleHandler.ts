import type { Config } from '../config';
import { type TransportItem, TransportItemType, type Transports } from '../transports';
import type { Observable } from '../utils';

import { USER_ACTION_CANCEL_MESSAGE_TYPE, USER_ACTION_END_MESSAGE_TYPE, USER_ACTION_START_MESSAGE_TYPE } from './const';
import { ItemBuffer } from './ItemBuffer';
import type { MeasurementEvent } from './measurements';
import type { APIEvent, ApiMessageBusMessages } from './types';

export function createUserActionLifecycleHandler({
  apiMessageBus,
  transports,
  config,
}: {
  apiMessageBus: Observable<ApiMessageBusMessages>;
  transports: Transports;
  config: Config;
}) {
  const actionBuffer = new ItemBuffer<TransportItem>();
  const trackUserActionsExcludeItem = config.trackUserActionsExcludeItem;
  let message: ApiMessageBusMessages | undefined;

  apiMessageBus.subscribe((msg) => {
    if (msg.type === USER_ACTION_START_MESSAGE_TYPE) {
      message = msg;
      return;
    }

    if (msg.type === USER_ACTION_END_MESSAGE_TYPE) {
      const { id, name } = msg;

      actionBuffer.flushBuffer((item) => {
        // Exclude web-vitals from user actions
        if (isExcludeFromUserAction(item, trackUserActionsExcludeItem)) {
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

    if (msg.type === USER_ACTION_CANCEL_MESSAGE_TYPE) {
      message = undefined;
      actionBuffer.flushBuffer((item) => {
        transports.execute(item);
      });
    }
  });

  const getMessage = (): typeof message => message;
  return { actionBuffer, getMessage };
}

function isExcludeFromUserAction(
  item: TransportItem<APIEvent>,
  trackUserActionsExcludeItem: Config['trackUserActionsExcludeItem']
) {
  return (
    trackUserActionsExcludeItem?.(item) ||
    (item.type === TransportItemType.MEASUREMENT && (item.payload as MeasurementEvent).type === 'web-vitals')
  );
}
