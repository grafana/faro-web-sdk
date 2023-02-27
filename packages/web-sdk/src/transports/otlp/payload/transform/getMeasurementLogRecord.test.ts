import { MeasurementEvent, TransportItem, TransportItemType } from '@grafana/faro-core';

import { toScopeLog } from './transform';

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
      attributes: {
        userAttribute1: 'one',
        userAttribute2: 'two',
      },
    } as const,
  } as const,
};

const measurementLogRecordPayload = {
  timeUnixNano: 1674813181035000000,

  attributes: [
    {
      key: 'grafana.view.name',
      value: {
        stringValue: 'view-default',
      },
    },
    {
      key: 'http.url',
      value: {
        stringValue: 'http://localhost:5173',
      },
    },
    {
      key: 'grafana.page.id',
      value: {
        stringValue: 'page-id',
      },
    },
    {
      key: 'grafana.page.attributes',
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
      key: 'grafana.session.id',
      value: { stringValue: 'session-abcd1234' },
    },
    {
      key: 'grafana.session.attributes',
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
      key: 'enduser.id',
      value: { stringValue: 'user-abc123' },
    },
    {
      key: 'grafana.enduser.name',
      value: { stringValue: 'user-joe' },
    },
    {
      key: 'grafana.enduser.email',
      value: { stringValue: 'user@example.com' },
    },
    {
      key: 'grafana.enduser.attributes',
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
      key: 'grafana.measurement.type',
      value: { stringValue: 'web-vitals' },
    },
    {
      key: 'grafana.measurement.name',
      value: { stringValue: 'fcp' },
    },
    {
      key: 'grafana.measurement.value',
      value: { doubleValue: 213.7000000011176 },
    },
  ],
} as const;

describe('getMeasurementLogRecord', () => {
  it('Builds resource payload object for given transport item.', () => {
    const measurementLogRecord = toScopeLog(item).logRecords[0];
    expect(measurementLogRecord).toMatchObject(measurementLogRecordPayload);
  });
});
