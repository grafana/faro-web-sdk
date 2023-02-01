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
  BROWSER_NAME: 'browser.name', // FARO
  BROWSER_VERSION: 'browser.version', // FARO

  SESSION_ID: 'session.id', // FARO
  SESSION_ATTRIBUTES: 'session.attributes', // FARO

  ENDUSER_NAME: 'enduser.name', // FARO
  ENDUSER_EMAIL: 'enduser.email', // FARO
  ENDUSER_ATTRIBUTES: 'enduser.attributes', // FARO

  APP_RELEASE: 'app.release', // FARO
} as const;

// TODO: put in different objects
export const sematicAttributes = {
  VIEW_NAME: 'view.name',
  // Currently missing in sematic-conventions npm package
  EVENT_NAME: 'event.name',
  EVENT_DOMAIN: 'event.domain',
} as const;
