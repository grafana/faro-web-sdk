import { MeasurementEvent, TransportItem, TransportItemType } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import type { OtlpHttpTransportOptions } from '../../types';

import { getLogTransforms } from './transform';

const item: TransportItem<MeasurementEvent> = {
  type: TransportItemType.MEASUREMENT,
  payload: {
    type: 'web-vitals',
    timestamp: '2023-01-27T09:53:01.035Z',
    values: { fcp: 213.7000000011176 },
    trace: {
      trace_id: 'trace-id',
      span_id: 'span-id',
    } as const,
  },
  meta: {
    view: {
      name: 'view-default',
    },
    page: {
      id: 'page-id',
      url: 'http://localhost:5173',
      attributes: {
        pageAttribute1: 'one',
        pageAttribute2: 'two',
      },
    },
    session: {
      id: 'session-abcd1234',
      attributes: {
        sessionAttribute1: 'one',
        sessionAttribute2: 'two',
      },
    },
    user: {
      email: 'user@example.com',
      id: 'user-abc123',
      username: 'user-joe',
      fullName: 'user-full-name',
      roles: 'user-role-one,user-role-two',
      hash: 'user-hash',
      attributes: {
        userAttribute1: 'one',
        userAttribute2: 'two',
      },
    },
  } as const,
};

const matchMeasurementLogRecord = {
  timeUnixNano: 1674813181035000000,

  attributes: [
    {
      key: 'view.name',
      value: {
        stringValue: 'view-default',
      },
    },
    {
      key: 'url.full',
      value: {
        stringValue: 'http://localhost:5173',
      },
    },
    {
      key: 'page.id',
      value: {
        stringValue: 'page-id',
      },
    },
    {
      key: 'page.attributes',
      value: {
        kvlistValue: {
          values: [
            {
              key: 'pageAttribute1',
              value: {
                stringValue: 'one',
              },
            },
            {
              key: 'pageAttribute2',
              value: {
                stringValue: 'two',
              },
            },
          ],
        },
      },
    },
    {
      key: 'session.id',
      value: { stringValue: 'session-abcd1234' },
    },
    {
      key: 'session.attributes',
      value: {
        kvlistValue: {
          values: [
            {
              key: 'sessionAttribute1',
              value: {
                stringValue: 'one',
              },
            },
            {
              key: 'sessionAttribute2',
              value: {
                stringValue: 'two',
              },
            },
          ],
        },
      },
    },
    {
      key: 'user.id',
      value: { stringValue: 'user-abc123' },
    },
    {
      key: 'user.name',
      value: { stringValue: 'user-joe' },
    },
    {
      key: 'user.email',
      value: { stringValue: 'user@example.com' },
    },
    {
      key: 'user.full_name',
      value: { stringValue: 'user-full-name' },
    },
    {
      key: 'user.roles',
      value: { stringValue: 'user-role-one,user-role-two' },
    },
    {
      key: 'user.hash',
      value: { stringValue: 'user-hash' },
    },
    {
      key: 'user.attributes',
      value: {
        kvlistValue: {
          values: [
            {
              key: 'userAttribute1',
              value: {
                stringValue: 'one',
              },
            },
            {
              key: 'userAttribute2',
              value: {
                stringValue: 'two',
              },
            },
          ],
        },
      },
    },
    {
      key: 'measurement.type',
      value: { stringValue: 'web-vitals' },
    },
    {
      key: 'measurement.name',
      value: { stringValue: 'fcp' },
    },
    {
      key: 'measurement.value',
      value: { doubleValue: 213.7000000011176 },
    },
  ],

  traceId: 'trace-id',
  spanId: 'span-id',
} as const;

describe('toMeasurementLogRecord', () => {
  it('Builds resource payload object for given transport item.', () => {
    const measurementLogRecord = getLogTransforms(mockInternalLogger).toScopeLog(item).logRecords[0];
    expect(measurementLogRecord).toStrictEqual(matchMeasurementLogRecord);
  });

  it('Builds resource payload object for given transport item with custom body attached.', () => {
    const customOtlpTransform: OtlpHttpTransportOptions['otlpTransform'] = {
      createMeasurementLogBody(item) {
        const { payload } = item;
        const [measurementName, measurementValue] = Object.entries(payload.values).flat();
        const body = `faro.signal.measurement: type=${payload.type} name=${measurementName} value=${measurementValue}`;
        return body;
      },
    };

    const measurementLogRecord = getLogTransforms(mockInternalLogger, customOtlpTransform).toScopeLog(item)
      .logRecords[0];

    expect(measurementLogRecord).toStrictEqual({
      ...matchMeasurementLogRecord,
      body: {
        stringValue: 'faro.signal.measurement: type=web-vitals name=fcp value=213.7000000011176',
      },
    });
  });
});
