import { SpanKind } from '@opentelemetry/api';

import { apiMessageBus } from '@grafana/faro-web-sdk';
import type { UserActionCancelMessage, UserActionEndMessage, UserActionStartMessage } from '@grafana/faro-web-sdk';

import { FaroUserActionSpanProcessor } from './faroUserActionSpanProcessor';

describe('faroUserActionSpanProcessor', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const processor = new FaroUserActionSpanProcessor({
    onStart: jest.fn(),
    onEnd: jest.fn(),
    shutdown: jest.fn(),
    forceFlush: jest.fn(),
  });

  it('Adds faro.user.action.* attributes to the span if a "user-action-start" is available', () => {
    apiMessageBus.notify({
      name: 'test-action',
      parentId: 'test-parent-id',
      type: 'user-action-start',
    } as UserActionStartMessage);

    const span = {
      kind: SpanKind.CLIENT,
      attributes: {},
    };

    processor.onStart(span as any, {} as any);

    expect(span.attributes).toEqual({
      'faro.action.user.name': 'test-action',
      'faro.action.user.parentId': 'test-parent-id',
    });
  });

  it('Does not add faro.user.action.* attributes to the span if a "user-action-cancel" or "user-action-end" was received', () => {
    apiMessageBus.notify({
      name: 'test-action',
      parentId: 'test-parent-id',
      type: 'user-action-start',
    } as UserActionStartMessage);

    let span = {
      kind: SpanKind.CLIENT,
      attributes: {},
    };

    processor.onStart(span as any, {} as any);

    expect(span.attributes).toEqual({
      'faro.action.user.name': 'test-action',
      'faro.action.user.parentId': 'test-parent-id',
    });

    span = {
      kind: SpanKind.CLIENT,
      attributes: {},
    };

    apiMessageBus.notify({
      name: 'test-action',
      parentId: 'test-parent-id',
      type: 'user-action-end',
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      eventType: 'end',
      id: 'test-id',
    } as UserActionEndMessage);

    processor.onStart(span as any, {} as any);

    expect(span.attributes).toEqual({});

    apiMessageBus.notify({
      name: 'test-action',
      parentId: 'test-parent-id',
      type: 'user-action-start',
    } as UserActionStartMessage);

    span = {
      kind: SpanKind.CLIENT,
      attributes: {},
    };

    processor.onStart(span as any, {} as any);

    expect(span.attributes).toEqual({
      'faro.action.user.name': 'test-action',
      'faro.action.user.parentId': 'test-parent-id',
    });

    span = {
      kind: SpanKind.CLIENT,
      attributes: {},
    };

    apiMessageBus.notify({
      name: 'test-action',
      type: 'user-action-cancel',
      id: 'test-id',
    } as UserActionCancelMessage);

    processor.onStart(span as any, {} as any);

    expect(span.attributes).toEqual({});
  });
});
