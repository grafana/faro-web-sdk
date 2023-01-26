import { TelemetrySdkLanguageValues } from '@opentelemetry/semantic-conventions';
import type { APIEvent, Meta, TransportItem } from 'packages/web-sdk/src';

import { attributeValueType, toAttribute, toNestedAttributes } from './attributeUtils';
import { faroResourceAttributes } from './semanticResourceAttributes';
import type { Attribute, FaroResourceAttributes, PayloadMember } from './types';

export type ResourcePayload = {
  resource: {
    attributes: Attribute<FaroResourceAttributes>[];
    droppedAttributesCount: number;
  };
};

export class Resource implements PayloadMember<ResourcePayload> {
  private attributes: Attribute<FaroResourceAttributes>[] = [];
  private droppedAttributesCount = 0;

  constructor(private transportItem: TransportItem<Exclude<APIEvent, 'TraceEvent'>>) {
    const { browser, sdk, session, user, app } = transportItem.meta;

    this.attributes = [
      toAttribute(faroResourceAttributes.BROWSER_MOBILE, browser?.mobile, attributeValueType.bool),
      toAttribute(faroResourceAttributes.BROWSER_NAME, browser?.name),
      toAttribute(faroResourceAttributes.BROWSER_PLATFORM, browser?.os),
      toAttribute(faroResourceAttributes.BROWSER_VERSION, browser?.version),

      toAttribute(faroResourceAttributes.TELEMETRY_SDK_NAME, sdk?.name),
      toAttribute(faroResourceAttributes.TELEMETRY_SDK_VERSION, sdk?.version),
      // TODO: Q; do we want to add this? Is webjs the correct value (also ask the otel team)
      Boolean(sdk)
        ? toAttribute(faroResourceAttributes.TELEMETRY_SDK_LANGUAGE, TelemetrySdkLanguageValues.WEBJS)
        : undefined,

      toAttribute(faroResourceAttributes.SESSION_ID, session?.id),
      toNestedAttributes(faroResourceAttributes.SESSION_ATTRIBUTES, session?.attributes),

      toAttribute(faroResourceAttributes.ENDUSER_ID, user?.id),
      toAttribute(faroResourceAttributes.ENDUSER_NAME, user?.username),
      toAttribute(faroResourceAttributes.ENDUSER_EMAIL, user?.email),
      toNestedAttributes(faroResourceAttributes.ENDUSER_ATTRIBUTES, user?.attributes),

      toAttribute(faroResourceAttributes.APP_NAME, app?.name),
      toAttribute(faroResourceAttributes.APP_VERSION, app?.version),
      toAttribute(faroResourceAttributes.APP_ENVIRONMENT, app?.environment),
      toAttribute(faroResourceAttributes.APP_RELEASE, app?.release),
    ].filter((item): item is Attribute<FaroResourceAttributes> => Boolean(item));
  }

  isSameMeta(_meta: Meta) {
    // isDeepEqual(this.transportItem.meta, meta )
    // TODO: implement equality check
    return !this.transportItem;
  }

  getPayloadObject(): ResourcePayload {
    return {
      resource: {
        attributes: this.attributes,
        droppedAttributesCount: this.droppedAttributesCount,
      },
    } as const;
  }
}
