// Main entry point for @grafana/faro-react-native
export { initializeFaro } from './initialize';
export { faro } from '@grafana/faro-core';

// Export types
export type { ReactNativeConfig } from './config/types';

// Export instrumentation helpers
export { getRNInstrumentations } from './config/getRNInstrumentations';

// Export instrumentations
export { ErrorsInstrumentation } from './instrumentations/errors';
export type { ErrorsInstrumentationOptions } from './instrumentations/errors';
export { ConsoleInstrumentation } from './instrumentations/console';
export { SessionInstrumentation } from './instrumentations/session';
export { ViewInstrumentation } from './instrumentations/view';
export { AppStateInstrumentation } from './instrumentations/appState';
export { UserActionInstrumentation } from './instrumentations/userActions';
export { HttpInstrumentation } from './instrumentations/http';
export { PerformanceInstrumentation, trackScreenPerformance } from './instrumentations/performance';
export type { PerformanceInstrumentationOptions } from './instrumentations/performance/types';
export { StartupInstrumentation } from './instrumentations/startup';
export type { StartupInstrumentationOptions } from './instrumentations/startup/types';

// Export console utilities
export { reactNativeLogArgsSerializer } from './instrumentations/console/utils';

// Export user action helpers
export {
  withFaroUserAction,
  trackUserAction,
  type WithFaroUserActionProps,
} from './instrumentations/userActions/withFaroUserAction';

// Export error boundary
export { FaroErrorBoundary } from './errorBoundary/FaroErrorBoundary';
export { withFaroErrorBoundary } from './errorBoundary/withFaroErrorBoundary';
export type {
  FaroErrorBoundaryProps,
  FaroErrorBoundaryState,
  FaroErrorBoundaryFallbackRender,
} from './errorBoundary/types';

// Export metas
export { getDeviceMeta, getAsyncDeviceMeta, type ExtendedBrowserMeta } from './metas/device';
export { getScreenMeta } from './metas/screen';
export { getSdkMeta } from './metas/sdk';

// Export transports
export { FetchTransport } from './transports/fetch';
export { ConsoleTransport } from './transports/console';
export type { ConsoleTransportOptions } from './transports/console';

// Export navigation utilities
export { ReactNativeNavigationIntegration } from './navigation/v6';
export {
  useFaroNavigation,
  createNavigationStateChangeHandler,
  getCurrentRoute,
  getRouteName,
  onNavigationStateChange,
} from './navigation';
export type { ReactNavigationDependencies, ReactNavigationConfig } from './navigation/types';

// Re-export core types and enums that consumers will need
export type {
  Config,
  Faro,
  Instrumentation,
  Meta,
  Transport,
  PushErrorOptions,
  PushEventOptions,
  PushLogOptions,
  PushMeasurementOptions,
} from '@grafana/faro-core';

// Export LogLevel enum (not just the type)
export { LogLevel } from '@grafana/faro-core';
