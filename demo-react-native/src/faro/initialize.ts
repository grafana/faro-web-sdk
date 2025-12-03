import { FARO_COLLECTOR_URL } from '@env';

import {
  ConsoleTransport,
  FetchTransport,
  getRNInstrumentations,
  initializeFaro,
  LogLevel,
} from '@grafana/faro-react-native';
import { TracingInstrumentation } from '@grafana/faro-react-native-tracing';

/**
 * Initialize Faro for React Native demo app with Grafana Cloud
 */
export function initFaro() {
  if (!FARO_COLLECTOR_URL) {
    console.warn(
      'FARO_COLLECTOR_URL not configured. Faro will not be initialized.',
    );
    return undefined;
  }

  const faro = initializeFaro({
    app: {
      name: 'React Native Test',
      version: '1.0.0',
      environment: 'production',
    },
    instrumentations: [
      // React Native specific instrumentations (equivalent to getWebInstrumentations)
      ...getRNInstrumentations({
        captureConsole: true,
        trackAppState: true,
        captureErrors: true,
        trackSessions: true,
        trackViews: true,
        trackUserActions: true,
        trackHttpRequests: true,
        trackPerformance: true, // Enable performance tracking
      }),
      // Add tracing instrumentation to enable distributed tracing
      // Note: ignoreUrls are automatically extracted from transports via getIgnoreUrls()
      new TracingInstrumentation({}),
    ],
    transports: [
      new FetchTransport({
        url: FARO_COLLECTOR_URL,
      }),
      // Add ConsoleTransport for debugging - prints all events to console
      new ConsoleTransport({
        level: LogLevel.INFO, // Use INFO level to avoid too much noise
      }),
    ],
  });

  // Test that Faro is working by sending a test event
  faro.api.pushEvent('faro_initialized', {
    timestamp: new Date().toISOString(),
  });

  return faro;
}
