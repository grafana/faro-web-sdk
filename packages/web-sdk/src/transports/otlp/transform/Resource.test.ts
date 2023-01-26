import { LogEvent, LogLevel, TransportItem, TransportItemType } from '@grafana/faro-core';
import { Resource } from './Resource';

const item: TransportItem<LogEvent> = {
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: LogLevel.INFO,
    message: 'just a log message',
    timestamp: new Date().toISOString(),
  },
  meta: {
    browser: {
      name: 'browser-name',
      version: 'browser-v109.0',
      os: 'browser-MyOperationSystem',
      mobile: false,
    },
    sdk: {
      name: 'integration-web-sdk-name',
      version: 'integration-v1.2.3',
      integrations: [
        {
          name: 'integration-attribute-one',
          version: 'one',
        },
        {
          name: 'integration-attribute-two',
          version: 'two',
        },
      ],
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
    },
    app: {
      name: 'app-cool-app',
      release: 'app-v1.23',
      version: 'app-v2.0.0',
      environment: 'app-production',
    },
  },
};

const resourcePayload = {
  resource: {
    attributes: [
      {
        key: 'browser.mobile',
        value: { boolValue: false },
      },
      {
        key: 'browser.name',
        value: { stringValue: 'browser-name' },
      },
      {
        key: 'browser.platform',
        value: { stringValue: 'browser-MyOperationSystem' },
      },
      {
        key: 'browser.version',
        value: { stringValue: 'browser-v109.0' },
      },
      {
        key: 'telemetry.sdk.name',
        value: { stringValue: 'integration-web-sdk-name' },
      },
      {
        key: 'telemetry.sdk.version',
        value: { stringValue: 'integration-v1.2.3' },
      },
      // Not decided yet if we add language attribute
      {
        key: 'telemetry.sdk.language',
        value: { stringValue: 'webjs' },
      },
      {
        key: 'session.id',
        value: { stringValue: 'session-abcd1234' },
      },
      {
        key: 'session.attributes',
        value: {
          kvListValue: {
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
        key: 'enduser.name',
        value: { stringValue: 'user-joe' },
      },
      {
        key: 'enduser.email',
        value: { stringValue: 'user@example.com' },
      },
      {
        key: 'enduser.attributes',
        value: {
          kvListValue: {
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
        key: 'app.name',
        value: { stringValue: 'app-cool-app' },
      },
      {
        key: 'app.version',
        value: { stringValue: 'app-v2.0.0' },
      },
      {
        key: 'app.environment',
        value: { stringValue: 'app-production' },
      },
      {
        key: 'app.release',
        value: { stringValue: 'app-v1.23' },
      },
    ],
    droppedAttributesCount: 0,
  },
} as const;

describe('Resource', () => {
  test('Builds resource payload object for given transport item.', () => {
    const resource = new Resource(item);
    expect(resource.getPayloadObject()).toMatchObject(resourcePayload);
  });

  test('Does not add an attribute if the respective Meta property is empty.', () => {
    const resourceOnlyBrowserMeta = new Resource({
      type: item.type,
      payload: item.payload,
      meta: {
        browser: item.meta.browser,
      },
    });

    expect(resourceOnlyBrowserMeta.getPayloadObject()).toMatchObject({
      resource: {
        attributes: [
          {
            key: 'browser.mobile',
            value: { boolValue: false },
          },
          {
            key: 'browser.name',
            value: { stringValue: 'browser-name' },
          },
          {
            key: 'browser.platform',
            value: { stringValue: 'browser-MyOperationSystem' },
          },
          {
            key: 'browser.version',
            value: { stringValue: 'browser-v109.0' },
          },
        ],
        droppedAttributesCount: 0,
      },
    });

    const resourceNoMetas = new Resource({
      type: item.type,
      payload: item.payload,
      meta: {},
    });

    expect(resourceNoMetas.getPayloadObject()).toMatchObject({
      resource: {
        attributes: [],
        droppedAttributesCount: 0,
      },
    });
  });

  test('Does not add sdk language value if meta skd is available.', () => {
    const resourceWithSdkMeta = new Resource({
      type: item.type,
      payload: item.payload,
      meta: {
        sdk: item.meta.sdk,
      },
    });

    expect(
      resourceWithSdkMeta.getPayloadObject().resource.attributes.some(({ key }) => key === 'telemetry.sdk.language')
    ).toBe(true);

    const resourceNoSdkMeta = new Resource({
      type: item.type,
      payload: item.payload,
      meta: {
        browser: item.meta.browser,
      },
    });

    expect(
      resourceNoSdkMeta.getPayloadObject().resource.attributes.some(({ key }) => key === 'telemetry.sdk.language')
    ).toBe(false);
  });
});
