/**
 * Semantic convention attributes for React Native tracing
 * Based on OpenTelemetry semantic conventions with React Native-specific additions
 */

// Session attributes
export const ATTR_SESSION_ID = 'session.id';

// Device/Platform attributes for React Native
export const ATTR_DEVICE_MODEL = 'device.model';
export const ATTR_DEVICE_BRAND = 'device.brand';
export const ATTR_DEVICE_PLATFORM = 'device.platform';
export const ATTR_DEVICE_OS_VERSION = 'device.os.version';
export const ATTR_DEVICE_TYPE = 'device.type';
export const ATTR_DEVICE_LOCALE = 'device.locale';

// App attributes
export const ATTR_APP_VERSION = 'app.version';
export const ATTR_APP_BUILD = 'app.build';

// Service attributes
export const ATTR_SERVICE_NAMESPACE = 'service.namespace';
export const ATTR_DEPLOYMENT_ENVIRONMENT_NAME = 'deployment.environment.name';

// Telemetry attributes
export const ATTR_TELEMETRY_DISTRO_NAME = 'telemetry.distro.name';
export const ATTR_TELEMETRY_DISTRO_VERSION = 'telemetry.distro.version';

// Process/Runtime attributes
export const ATTR_PROCESS_RUNTIME_NAME = 'process.runtime.name';
export const ATTR_PROCESS_RUNTIME_VERSION = 'process.runtime.version';
