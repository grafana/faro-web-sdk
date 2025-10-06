import { type Config } from '../../config';
import { faro } from '../../sdk/registerFaro';
import { type TransportItem, TransportItemType, type Transports } from '../../transports';
import { dateNow, genShortID, Observable, stringifyObjectValues } from '../../utils';
import { ItemBuffer } from '../ItemBuffer';
import { type MeasurementEvent } from '../measurements';
import { type APIEvent } from '../types';

import { UserActionSeverity } from './const';
import { type HaltPredicate, type UserActionInterface, UserActionState } from './types';

const defaultFollowUpActionTimeRange = 100;
const defaultHaltTimeout = 10 * 1000;

export default class UserAction extends Observable implements UserActionInterface {
  name: string;
  id: string;
  attributes?: Record<string, string>;
  parentId: string;
  trigger: string;
  severity: UserActionSeverity;
  startTime?: number;
  trackUserActionsExcludeItem?: (item: TransportItem<APIEvent>) => boolean;
  cancelTimeout: number;
  haltTimeout: number;

  private _state: UserActionState;
  private _timeoutId?: number;
  private _itemBuffer: ItemBuffer<TransportItem>;
  private _transports: Transports;
  private _haltTimeoutId: any;
  private _isValid: boolean;

  constructor({
    name,
    parentId,
    haltTimeout,
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
    this.cancelTimeout = defaultFollowUpActionTimeRange;
    this.haltTimeout = haltTimeout ?? defaultHaltTimeout;
    this.parentId = parentId ?? this.id;
    this.trackUserActionsExcludeItem = trackUserActionsExcludeItem;
    this.severity = severity;

    this._itemBuffer = new ItemBuffer<TransportItem>();
    this._transports = transports;
    this._haltTimeoutId = -1;
    this._state = UserActionState.Started;
    this._isValid = false;
    this._start();
  }

  addItem(item: TransportItem) {
    this._itemBuffer.addItem(item);
  }

  extend(haltPredicate?: HaltPredicate) {
    if (!this._isValid) {
      this._isValid = true;
    }
    this._setFollowupActionTimeout(haltPredicate);
  }

  private _setFollowupActionTimeout(haltPredicate?: HaltPredicate) {
    this._timeoutId = startTimeout(
      this._timeoutId,
      () => {
        if (this._state === UserActionState.Started && haltPredicate?.()) {
          this.halt();
        } else if (this._isValid) {
          this.end();
        } else {
          this.cancel();
        }
      },
      defaultFollowUpActionTimeRange
    );
  }

  private _start(): void {
    this._state = UserActionState.Started;
    if (this._state === UserActionState.Started) {
      this.startTime = dateNow();
    }
    this._setFollowupActionTimeout();
  }

  halt() {
    if (this._state !== UserActionState.Started) {
      return;
    }
    this._state = UserActionState.Halted;

    // If the halt timeout fires, we end the user action as
    // it is still a valid one.
    this._haltTimeoutId = setTimeout(() => {
      this.end();
    }, this.haltTimeout);
    this.notify(this._state);
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

    // Make sure we don't end the user action twice
    clearTimeout(this._haltTimeoutId);
    clearTimeout(this._timeoutId);

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
      'faro.user.action',
      {
        userActionStartTime: this.startTime!.toString(),
        userActionEndTime: endTime.toString(),
        userActionDuration: duration.toString(),
        userActionTrigger: this.trigger!,
        userActionSeverity: this.severity,
        userActionName: this.name,
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

function startTimeout(timeoutId: number | undefined, cb: () => void, delay: number) {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  //@ts-expect-error for some reason vscode is using the node types
  timeoutId = setTimeout(() => {
    cb();
  }, delay);

  return timeoutId;
}
