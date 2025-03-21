import {
  type APIEvent,
  ApiMessageBusMessages,
  type Config,
  dateNow,
  EventEvent,
  type Meta,
  TransportItem,
  TransportItemType,
  UserActionStartMessage,
} from '..';
import { Observable } from '../utils/reactive';

import { mockTransports } from './apiTestHelpers';
import { USER_ACTION_CANCEL_MESSAGE_TYPE, USER_ACTION_END_MESSAGE_TYPE, USER_ACTION_START_MESSAGE_TYPE } from './const';
import { createUserActionLifecycleHandler } from './userActionLifecycleHandler';

describe('userActionLifecycleHandler', () => {
  it('assigns the user-action-start message to the message variable when it receives it', () => {
    const apiMessageBus = new Observable<ApiMessageBusMessages>();

    const { getMessage } = createUserActionLifecycleHandler({
      apiMessageBus,
      transports: mockTransports,
      config: {} as Config,
    });

    const message: UserActionStartMessage = {
      type: USER_ACTION_START_MESSAGE_TYPE,
      name: '',
      startTime: 0,
      parentId: '',
    };

    apiMessageBus.notify(message);

    expect(getMessage()).toEqual(message);
  });

  it('When it receives a user-action-cancel message, it resets the cached message flushes the buffer and sends the items to the transports', () => {
    const apiMessageBus = new Observable<ApiMessageBusMessages>();

    const mockExecute = jest.fn();
    const { actionBuffer, getMessage } = createUserActionLifecycleHandler({
      apiMessageBus,
      transports: {
        ...mockTransports,
        execute: mockExecute,
      },
      config: {} as Config,
    });

    const message: UserActionStartMessage = {
      type: USER_ACTION_START_MESSAGE_TYPE,
      name: '',
      startTime: 0,
      parentId: '',
    };

    apiMessageBus.notify(message);

    const item = { type: TransportItemType.EVENT, payload: {}, meta: {} as Meta };
    actionBuffer.addItem(item);

    const cancelMessage: ApiMessageBusMessages = {
      type: USER_ACTION_CANCEL_MESSAGE_TYPE,
      name: 'pointerdown',
    };

    apiMessageBus.notify(cancelMessage);

    expect(getMessage()).toBeUndefined();
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(item);
    expect(actionBuffer.size()).toEqual(0);
  });

  it('When it receives a user-action-end message, it sends the items to the transports with the action parentId and name', () => {
    const apiMessageBus = new Observable<ApiMessageBusMessages>();

    const mockExecute = jest.fn();
    const { actionBuffer } = createUserActionLifecycleHandler({
      apiMessageBus,
      transports: {
        ...mockTransports,
        execute: mockExecute,
      },
      config: {} as Config,
    });

    const message: UserActionStartMessage = {
      type: USER_ACTION_START_MESSAGE_TYPE,
      name: 'pointerdown',
      startTime: 0,
      parentId: '123',
    };

    apiMessageBus.notify(message);

    const item = { type: TransportItemType.EVENT, payload: {}, meta: {} as Meta };
    actionBuffer.addItem(item);

    const endMessage: ApiMessageBusMessages = {
      type: USER_ACTION_END_MESSAGE_TYPE,
      id: '123',
      name: 'pointerdown',
      startTime: 100,
      endTime: 120,
      duration: 20,
      eventType: 'keydown',
    };

    apiMessageBus.notify(endMessage);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith({
      ...item,
      payload: {
        ...item.payload,
        action: {
          parentId: '123',
          name: 'pointerdown',
        },
      },
    });
  });

  it('excludes items defined by the isExcludeFromUserAction function from the user actions', () => {
    const apiMessageBus = new Observable<ApiMessageBusMessages>();

    const mockExecute = jest.fn();
    const { actionBuffer, getMessage } = createUserActionLifecycleHandler({
      apiMessageBus,
      transports: {
        ...mockTransports,
        execute: mockExecute,
      },
      config: {
        trackUserActionsExcludeItem(item) {
          return item.type === TransportItemType.EVENT && (item.payload as EventEvent).name === 'i-am-excluded';
        },
      } as Config,
    });

    const message: UserActionStartMessage = {
      type: USER_ACTION_START_MESSAGE_TYPE,
      name: 'pointerdown',
      startTime: 0,
      parentId: '123',
    };

    apiMessageBus.notify(message);

    const itemEvent = { type: TransportItemType.EVENT, payload: {}, meta: {} as Meta };
    actionBuffer.addItem(itemEvent);

    const itemMeasurement: TransportItem<APIEvent> = {
      type: TransportItemType.MEASUREMENT,
      payload: { type: 'web-vitals', values: {}, timestamp: dateNow().toString() },
      meta: {} as Meta,
    };
    actionBuffer.addItem(itemMeasurement);

    const itemEventExcluded: TransportItem<EventEvent> = {
      type: TransportItemType.EVENT,
      payload: {
        timestamp: dateNow().toString(),
        name: 'i-am-excluded',
      },
      meta: {} as Meta,
    };
    actionBuffer.addItem(itemEventExcluded);

    const endMessage: ApiMessageBusMessages = {
      type: USER_ACTION_END_MESSAGE_TYPE,
      id: '123',
      name: 'pointerdown',
      startTime: 100,
      endTime: 120,
      duration: 20,
      eventType: 'keydown',
    };

    apiMessageBus.notify(endMessage);

    expect(mockExecute).toHaveBeenCalledTimes(3);
    expect(mockExecute).toHaveBeenNthCalledWith(1, {
      ...itemEvent,
      payload: {
        ...itemEvent.payload,
        action: {
          parentId: '123',
          name: 'pointerdown',
        },
      },
    });
    expect(mockExecute).toHaveBeenNthCalledWith(2, itemMeasurement);
    expect(mockExecute).toHaveBeenNthCalledWith(3, itemEventExcluded);
    expect(getMessage()).toBeUndefined();
  });
});
