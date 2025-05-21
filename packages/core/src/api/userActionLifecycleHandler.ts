import type { Config } from '../config';
import { type TransportItem, TransportItemType, type Transports } from '../transports';
import type { Observable } from '../utils';

import { USER_ACTION_CANCEL, USER_ACTION_END, USER_ACTION_HALT, USER_ACTION_START } from './const';
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
    if (USER_ACTION_START === msg.type || USER_ACTION_HALT === msg.type) {
      message = msg;
      return;
    }

    if (msg.type === USER_ACTION_END) {
      const { id, name } = msg;

      actionBuffer.flushBuffer((item) => {
        if (isExcludeFromUserAction(item, trackUserActionsExcludeItem)) {
          transports.execute(item);
          return;
        }

        const userActionItem = {
          ...item,
          payload: {
            ...item.payload,
            action: {
              parentId: id,
              name,
            },
          },
        } as TransportItem;

        transports.execute(userActionItem);
      });

      message = undefined;
      return;
    }

    if (msg.type === USER_ACTION_CANCEL) {
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
