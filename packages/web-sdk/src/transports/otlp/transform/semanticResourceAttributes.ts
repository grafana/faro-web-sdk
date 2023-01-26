import { SemanticAttributes, SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

/**
 * Seems currently to be missing in the semantic-conventions npm package.
 * See: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/README.md#todos
 *
 * Took the few attributes as defined in the docs
 */
export const SemanticBrowserAttributes = {
  BROWSER_BRANDS: 'browser.brands', // TODO: Q: shall we add this to meta.ts => navigator.userAgentData.brands. !The spec is still experimental!
  BROWSER_PLATFORM: 'browser.platform',
  BROWSER_MOBILE: 'browser.mobile',
  BROWSER_USER_AGENT: 'browser.user_agent', // TODO: Q: shall we add this to meta.ts => parser.getUA()
  BROWSER_LANGUAGE: 'browser.language', // TODO: Q: shall we add this to meta.ts => window.navigator.language
} as const;

export const faroResourceAttributes = {
  BROWSER_MOBILE: SemanticBrowserAttributes.BROWSER_MOBILE, // browser.mobile
  BROWSER_NAME: 'browser.name', // FARO
  BROWSER_VERSION: 'browser.version', // FARO
  BROWSER_PLATFORM: SemanticBrowserAttributes.BROWSER_PLATFORM, // 'browser.platform'

  TELEMETRY_SDK_NAME: SemanticResourceAttributes.TELEMETRY_SDK_NAME, // 'telemetry.sdk.name',
  TELEMETRY_SDK_LANGUAGE: SemanticResourceAttributes.TELEMETRY_SDK_LANGUAGE, // 'telemetry.sdk.language',
  TELEMETRY_SDK_VERSION: SemanticResourceAttributes.TELEMETRY_SDK_VERSION, //'telemetry.sdk.version',

  SESSION_ID: 'session.id', // FARO
  SESSION_ATTRIBUTES: 'session.attributes', // FARO

  ENDUSER_ID: SemanticAttributes.ENDUSER_ID, // 'enduser.id',
  ENDUSER_NAME: 'enduser.name', // FARO
  ENDUSER_EMAIL: 'enduser.email', // FARO
  ENDUSER_ATTRIBUTES: 'enduser.attributes', // FARO

  APP_NAME: 'app.name', // FARO
  APP_RELEASE: 'app.release', // FARO
  APP_VERSION: 'app.version', // FARO
  APP_ENVIRONMENT: 'app.environment', // FARO
} as const;

export const faroAttributes = {
  VIEW_NAME: 'view.name',
  PAGE_URL: 'page.url',
} as const;
