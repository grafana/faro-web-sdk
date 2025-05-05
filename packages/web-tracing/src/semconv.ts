/**
 Unstable SemConv
 Because the "incubating" entry-point may include breaking changes in minor versions,
 it is recommended that instrumentation libraries not import @opentelemetry/semantic-conventions/incubating in runtime code,
 but instead copy relevant definitions into their own code base. (This is the same recommendation as for other languages.)
 
 See: https://www.npmjs.com/package/@opentelemetry/semantic-conventions#:~:text=%7D)%3B-,Unstable%20SemConv,-Because%20the%20%22incubating
 */

export const ATTR_SESSION_ID = 'session.id';
export const ATTR_DEPLOYMENT_ENVIRONMENT_NAME = 'deployment.environment.name';
export const ATTR_SERVICE_NAMESPACE = 'service.namespace';

// https://opentelemetry.io/docs/specs/semconv/resource/process/#javascript-runtimes
export const ATTR_PROCESS_RUNTIME_NAME = 'process.runtime.name';
export const ATTR_PROCESS_RUNTIME_VERSION = 'process.runtime.version';

// https://opentelemetry.io/docs/specs/semconv/attributes-registry/telemetry/#telemetry-attributes
export const ATTR_TELEMETRY_DISTRO_NAME = 'telemetry.distro.name';
export const ATTR_TELEMETRY_DISTRO_VERSION = 'telemetry.distro.version';

// https://opentelemetry.io/docs/specs/semconv/resource/browser/
export const ATTR_BROWSER_BRANDS = 'browser.brands';
export const ATTR_BROWSER_LANGUAGE = 'browser.language';
export const ATTR_BROWSER_MOBILE = 'browser.mobile';
export const ATTR_BROWSER_PLATFORM = 'browser.platform';
