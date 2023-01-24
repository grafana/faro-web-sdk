import { SemanticResourceAttributes, SemanticAttributes } from '@opentelemetry/semantic-conventions';
import type { APIEvent } from 'packages/core/src/api';
import type { TransportItem } from 'packages/core/src/transports';

/**
 * Seems currently to be missing in the semantic-conventions npm package.
 * See: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/README.md#todos
 *
 * Took the few attributes as defined in the docs
 */
export const SemanticBrowserAttributes = Object.freeze({
  BROWSER_BRANDS: 'browser.brands', // TODO: Q: shall we add this to meta.ts => navigator.userAgentData.brands. !The spec is still experimental!
  BROWSER_PLATFORM: 'browser.platform',
  BROWSER_MOBILE: 'browser.mobile',
  BROWSER_USER_AGENT: 'browser.user_agent', // TODO: Q: shall we add this to meta.ts => parser.getUA()
  BROWSER_LANGUAGE: 'browser.language', // TODO: Q: shall we add this to meta.ts => window.navigator.language
});

const faroResourceAttributes = {
  BROWSER_MOBILE: SemanticBrowserAttributes.BROWSER_MOBILE, // OTEL SEMANTIC CONVENTIONS
  BROWSER_NAME: 'browser.name', // FARO
  BROWSER_VERSION: 'browser.version', // FARO
  BROWSER_PLATFORM: 'browser.platform', // OTEL SEMANTIC CONVENTIONS

  TELEMETRY_SDK: 'telemetry.sdk.name', // OTEL SEMANTIC CONVENTIONS
  TELEMETRY_LANGUAGE: 'telemetry.sdk.language', // OTEL SEMANTIC CONVENTIONS
  TELEMETRY_VERSION: 'telemetry.sdk.version', // OTEL SEMANTIC CONVENTIONS

  SESSION_ID: 'session.id', // FARO
  SESSION_ATTRIBUTES: 'session.attributes', // FARO

  ENDUSER_ID: 'enduser.id', // OTEL SEMANTIC CONVENTIONS
  ENDUSER_NAME: 'enduser.name', // FARO
  ENDUSER_EMAIL: 'enduser.email', // FARO
  ENDUSER_ATTRIBUTES: 'enduser.attributes', // FARO

  APP_NAME: 'app.name', // FARO
  APP_RELEASE: 'app.release', // FARO
  APP_VERSION: 'app.version', // FARO
  APP_ENVIRONMENT: 'app.environment', // FARO
} as const;

type FaroResourceAttributes = typeof faroResourceAttributes[keyof typeof faroResourceAttributes];

// export function toOtlpLog(): unknown {
//   throw new Error('Function is not implemented yet');
// }

interface Resource {
  foo(...args: unknown[]): void;
  bar(...args: unknown[]): void;
}

type ResourceLogs = {
  resource: Resource;
  scopeLogs: unknown[];
};

type Attributes = {
  key: FaroResourceAttributes;
  // value: { [key in 'boolValue' | 'stringValue']: any };
  value: { [key: string]: unknown };
};

class Resource {
  private attributes: Attributes[] = [];

  constructor(transportItem: TransportItem<Exclude<APIEvent, 'TraceEvent'>>) {
    this.attributes.push(
      toAttribute(faroResourceAttributes.BROWSER_MOBILE, transportItem.meta.browser?.mobile, 'bool'),
      toAttribute(faroResourceAttributes.BROWSER_NAME, transportItem.meta.browser?.name),
      toAttribute(faroResourceAttributes.BROWSER_PLATFORM, transportItem.meta.browser?.os),
      toAttribute(faroResourceAttributes.BROWSER_VERSION, transportItem.meta.browser?.version)
    );

    // telemetry.sdk.name'  transportItem.meta.sdk?.name;
    // telemetry.sdk.version'  transportItem.meta.sdk?.version;
    // telemetry.sdk.language'  'JavaScript';
    // session.id' = transportI .meta.session?.id;
    // session.attributes' = transportI .meta.session?.attributes;
    // enduser.id' = transportI .meta.user?.id;
    // enduser.name' = transportI .meta.user?.username;
    // enduser.email' = transportI .meta.user?.email;
    // enduser.attributes' = transportI .meta.user?.attributes;
    // app.name = transportI .meta.app?.name;
    // app.release' = transportI .meta.app?.release;
    // app.version' = transportI .meta.app?.version;
    // app.environment' = transportI .meta.app?.environment;
  }
}

function toAttribute(key: FaroResourceAttributes, value: any, type: 'bool' | 'string' = 'string') {
  return {
    key,
    value: { [`${type}Value`]: value },
  };
}
