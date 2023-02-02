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
  PAGE_ID: 'page.id',
  PAGE_ATTRIBUTES: 'page.attributes',

  BROWSER_NAME: 'browser.name',
  BROWSER_VERSION: 'browser.version',

  SESSION_ID: 'session.id',
  SESSION_ATTRIBUTES: 'session.attributes',

  ENDUSER_NAME: 'enduser.name',
  ENDUSER_EMAIL: 'enduser.email',
  ENDUSER_ATTRIBUTES: 'enduser.attributes',

  APP_RELEASE: 'app.release',
} as const;

// TODO: put in different objects
export const sematicAttributes = {
  VIEW_NAME: 'view.name',
  // Currently missing in sematic-conventions npm package
  EVENT_NAME: 'event.name',
  EVENT_DOMAIN: 'event.domain',
} as const;
