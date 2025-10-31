import { type Config } from '../../config';
import { faro } from '../../sdk/registerFaro';
import { type TransportItem, TransportItemType, type Transports } from '../../transports';
import { dateNow, genShortID, Observable, stringifyObjectValues } from '../../utils';
import { ItemBuffer } from '../ItemBuffer';
import { type MeasurementEvent } from '../measurements';
import { type APIEvent } from '../types';

import { userActionEventName, UserActionSeverity } from './const';
import { type UserActionInterface, UserActionState } from './types';

export default class UserAction extends Observable implements UserActionInterface {
  name: string;
  id: string;
  attributes?: Record<string, string>;
  parentId: string;
  trigger: string;
  severity: UserActionSeverity;
  startTime?: number;
  trackUserActionsExcludeItem?: (item: TransportItem<APIEvent>) => boolean;

  private _state: UserActionState;
  private _itemBuffer: ItemBuffer<TransportItem>;
  private _transports: Transports;

  constructor({
    name,
    parentId,
    trigger,
    transports,
    attributes,
    trackUserActionsExcludeItem,
    severity = UserActionSeverity.Normal,
  }: {
    name: string;
    transports: Transports;
    parentId?: string;
    trigger: string;
    attributes?: Record<string, string>;
    haltTimeout?: number;
    trackUserActionsExcludeItem?: (item: TransportItem<APIEvent>) => boolean;
    severity?: UserActionSeverity;
  }) {
    super();
    this.name = name;
    this.attributes = attributes;
    this.id = genShortID();
    this.trigger = trigger;
    this.parentId = parentId ?? this.id;
    this.trackUserActionsExcludeItem = trackUserActionsExcludeItem;
    this.severity = severity;

    this._itemBuffer = new ItemBuffer<TransportItem>();
    this._transports = transports;
    this._state = UserActionState.Started;
    this._start();
  }

  addItem(item: TransportItem): boolean {
    if (this._state === UserActionState.Started) {
      this._itemBuffer.addItem(item);
      return true;
    }
    return false;
  }

  private _start(): void {
    this._state = UserActionState.Started;
    if (this._state === UserActionState.Started) {
      this.startTime = dateNow();
    }
  }

  cancel() {
    if (this._state === UserActionState.Started) {
      // Empty the buffer
      this._itemBuffer.flushBuffer();
    }

    this._state = UserActionState.Cancelled;
    this.notify(this._state);
  }

  end() {
    if (this._state === UserActionState.Cancelled) {
      return;
    }

    const endTime = dateNow();
    const duration = endTime - this.startTime!;
    this._state = UserActionState.Ended;
    this._itemBuffer.flushBuffer((item) => {
      if (isExcludeFromUserAction(item, this.trackUserActionsExcludeItem)) {
        this._transports.execute(item);
        return;
      }

      const userActionItem = {
        ...item,
        payload: {
          ...item.payload,
          action: {
            parentId: this.id,
            name: this.name,
          },
        },
      } as TransportItem;

      this._transports.execute(userActionItem);
    });

    this._state = UserActionState.Ended;
    this.notify(this._state);

    faro.api.pushEvent(
      userActionEventName,
      {
        userActionName: this.name,
        userActionStartTime: this.startTime!.toString(),
        userActionEndTime: endTime.toString(),
        userActionDuration: duration.toString(),
        userActionTrigger: this.trigger!,
        userActionSeverity: this.severity,
        ...stringifyObjectValues(this.attributes),
      },
      undefined,
      {
        timestampOverwriteMs: this.startTime,
        customPayloadTransformer: (payload) => {
          payload.action = {
            id: this.id,
            name: this.name,
          };

          return payload;
        },
      }
    );
  }

  getState(): UserActionState {
    return this._state;
  }
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
