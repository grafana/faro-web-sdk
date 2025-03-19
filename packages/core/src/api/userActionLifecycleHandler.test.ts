import {
  type APIEvent,
  ApiMessageBusMessages,
  dateNow,
  type Meta,
  TransportItem,
  TransportItemType,
  UserActionStartMessage,
} from '..';
import { Observable } from '../utils/reactive';

import { mockTransports } from './apiTestHelpers';
import { createUserActionLifecycleHandler } from './userActionLifecycleHandler';

describe('userActionLifecycleHandler', () => {
  it('assigns the user-action-start message to the message variable when it receives it', () => {
    const apiMessageBus = new Observable<ApiMessageBusMessages>();

    const { getMessage } = createUserActionLifecycleHandler(apiMessageBus, mockTransports);

    const message: UserActionStartMessage = {
      type: 'user-action-start',
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
    const { actionBuffer, getMessage } = createUserActionLifecycleHandler(apiMessageBus, {
      ...mockTransports,
      execute: mockExecute,
    });

    const message: UserActionStartMessage = {
      type: 'user-action-start',
      name: '',
      startTime: 0,
      parentId: '',
    };

    apiMessageBus.notify(message);

    const item = { type: TransportItemType.EVENT, payload: {}, meta: {} as Meta };
    actionBuffer.addItem(item);

    const cancelMessage: ApiMessageBusMessages = {
      type: 'user-action-cancel',
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
    const { actionBuffer } = createUserActionLifecycleHandler(apiMessageBus, {
      ...mockTransports,
      execute: mockExecute,
    });

    const message: UserActionStartMessage = {
      type: 'user-action-start',
      name: 'pointerdown',
      startTime: 0,
      parentId: '123',
    };

    apiMessageBus.notify(message);

    const item = { type: TransportItemType.EVENT, payload: {}, meta: {} as Meta };
    actionBuffer.addItem(item);

    const endMessage: ApiMessageBusMessages = {
      type: 'user-action-end',
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
    const { actionBuffer } = createUserActionLifecycleHandler(apiMessageBus, {
      ...mockTransports,
      execute: mockExecute,
    });

    const message: UserActionStartMessage = {
      type: 'user-action-start',
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

    const endMessage: ApiMessageBusMessages = {
      type: 'user-action-end',
      id: '123',
      name: 'pointerdown',
      startTime: 100,
      endTime: 120,
      duration: 20,
      eventType: 'keydown',
    };

    apiMessageBus.notify(endMessage);

    expect(mockExecute).toHaveBeenCalledTimes(2);
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
  });
});
