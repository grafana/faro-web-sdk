/**
 Unstable SemConv
 Because the "incubating" entry-point may include breaking changes in minor versions,
 it is recommended that instrumentation libraries not import @opentelemetry/semantic-conventions/incubating in runtime code,
 but instead copy relevant definitions into their own code base. (This is the same recommendation as for other languages.)
 
 See: https://www.npmjs.com/package/@opentelemetry/semantic-conventions#:~:text=%7D)%3B-,Unstable%20SemConv,-Because%20the%20%22incubating
 */

export const ATTR_BROWSER_BRANDS = 'browser.brands';
export const ATTR_BROWSER_LANGUAGE = 'browser.language';
export const ATTR_BROWSER_MOBILE = 'browser.mobile';
export const ATTR_BROWSER_PLATFORM = 'browser.platform';
export const ATTR_DEPLOYMENT_ENVIRONMENT_NAME = 'deployment.environment.name';
export const ATTR_SERVICE_NAMESPACE = 'service.namespace';
export const ATTR_SESSION_ID = 'session.id';
export const ATTR_USER_ATTRIBUTES = 'user.attributes';
export const ATTR_USER_EMAIL = 'user.email';
export const ATTR_USER_FULL_NAME = 'user.full_name';
export const ATTR_USER_HASH = 'user.hash';
export const ATTR_USER_ID = 'user.id';
export const ATTR_USER_NAME = 'user.name';
export const ATTR_USER_ROLES = 'user.roles';
