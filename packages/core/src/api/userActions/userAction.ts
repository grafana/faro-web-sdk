import { type TransportItem, TransportItemType, type Transports } from '../../transports';
import { dateNow, genShortID, monoNow, Observable, stringifyObjectValues } from '../../utils';
import type { EventsAPI } from '../events/types';
import { ItemBuffer } from '../ItemBuffer';
import { type MeasurementEvent } from '../measurements/types';
import { type APIEvent } from '../types';

import { userActionEventName, UserActionImportance, type UserActionImportanceType } from './const';
import { type UserActionInternalInterface, UserActionState, type UserActionTransportItemBuffer } from './types';

export default class UserAction
  extends Observable
  implements UserActionInternalInterface, UserActionTransportItemBuffer
{
  name: string;
  id: string;
  attributes?: Record<string, string>;
  parentId: string;
  trigger: string;
  importance: UserActionImportanceType;
  startTime?: number;
  // Monotonic counterpart to `startTime`, used to compute `duration` immune to wall-clock
  // adjustments (NTP step, manual clock change, DST). Not exposed in telemetry — see `end()`.
  private _startTimeMono?: number;
  trackUserActionsExcludeItem?: (item: TransportItem<APIEvent>) => boolean;

  private _state: UserActionState;
  private _itemBuffer: ItemBuffer<TransportItem>;
  private _transports: Transports;
  private _pushEvent: EventsAPI['pushEvent'];

  constructor({
    name,
    parentId,
    trigger,
    transports,
    attributes,
    trackUserActionsExcludeItem,
    importance = UserActionImportance.Normal,
    pushEvent,
  }: {
    name: string;
    transports: Transports;
    parentId?: string;
    trigger: string;
    attributes?: Record<string, string>;
    trackUserActionsExcludeItem?: (item: TransportItem<APIEvent>) => boolean;
    importance?: UserActionImportanceType;
    pushEvent: EventsAPI['pushEvent'];
  }) {
    super();
    this.name = name;
    this.attributes = attributes;
    this.id = genShortID();
    this.trigger = trigger;
    this.parentId = parentId ?? this.id;
    this.trackUserActionsExcludeItem = trackUserActionsExcludeItem;
    this.importance = importance;
    this._pushEvent = pushEvent;

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
      // `startTime` is wall-clock (Unix-epoch ms) so it can be used as the event's
      // `timestampOverwriteMs` and emitted as `userActionStartTime` for consumers that
      // correlate with other systems. `_startTimeMono` is the monotonic anchor used
      // for the duration calculation in `end()`.
      this.startTime = dateNow();
      this._startTimeMono = monoNow();
    }
  }

  halt() {
    if (this._state !== UserActionState.Started) {
      return;
    }
    this._state = UserActionState.Halted;
    this.notify(this._state);
  }

  cancel() {
    if (this._state === UserActionState.Started) {
      // Empty the buffer
      this._itemBuffer.flushBuffer((item) => {
        this._transports.execute(item);
      });
    }

    this._state = UserActionState.Cancelled;
    this.notify(this._state);
  }

  end() {
    if (this._state === UserActionState.Cancelled) {
      return;
    }

    const endTime = dateNow();
    // Compute duration from the monotonic clock so it is unaffected by wall-clock
    // adjustments during the action. Note: `endTime - startTime` (both wall-clock) may
    // disagree with `duration` if the system clock was adjusted between start and end;
    // `duration` is authoritative.
    const duration = monoNow() - this._startTimeMono!;
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

    this._pushEvent(
      userActionEventName,
      {
        userActionName: this.name,
        userActionStartTime: this.startTime!.toString(),
        userActionEndTime: endTime.toString(),
        userActionDuration: duration.toString(),
        userActionTrigger: this.trigger!,
        userActionImportance: this.importance,
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
  trackUserActionsExcludeItem: ((item: TransportItem<APIEvent>) => boolean) | undefined
) {
  return (
    trackUserActionsExcludeItem?.(item) ||
    (item.type === TransportItemType.MEASUREMENT && (item.payload as MeasurementEvent).type === 'web-vitals')
  );
}
