import { LogEvent, LogLevel, TransportItem, TransportItemType } from '@grafana/faro-core';
import { getLogLogRecord } from './transfomers';

const item: TransportItem<LogEvent> = {
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: LogLevel.INFO,
    message: 'Faro was initialized',
    timestamp: '2023-01-27T09:53:01.035Z',
  },
  meta: {
    view: {
      name: 'view-default',
    },
    page: {
      // id: '',
      url: 'http://localhost:5173',
      attributes: {
        pageAttribute1: 'page-attribute-one',
        pageAttribute2: 'page-attribute-two',
      },
    },
  },
} as const;

const logLogRecordPayload = {
  timeUnixNano: 1674813181035000000,
  observedTimeUnixNano: 1674813181035000000,
  severityNumber: 10,
  severityText: 'INFO2',
  body: {
    stringValue: 'Faro was initialized',
  },
  attributes: [
    {
      key: 'faro.log',
      value: {
        boolValue: true,
      },
    },

    {
      key: 'view.name',
      value: {
        stringValue: 'view-default',
      },
    },
    {
      key: 'page.url',
      value: {
        stringValue: 'http://localhost:5173',
      },
    },
  ],
  droppedAttributesCount: 0,
} as const;

describe('LogLogRecord', () => {
  it('Builds resource payload object for given transport item.', () => {
    const logLogRecord = getLogLogRecord(item);
    expect(logLogRecord).toMatchObject(logLogRecordPayload);
  });
});