import { FARO_COLLECTOR_URL } from '@env';

import {
  // @ts-expect-error - TS module resolution issue, export exists in source
  ConsoleTransport,
  FetchTransport,
  getRNInstrumentations,
  initializeFaro,
} from '@grafana/faro-react-native';
import { TracingInstrumentation } from '@grafana/faro-react-native-tracing';

/**
 * Demo versions to simulate different app releases
 */
const DEMO_VERSIONS = ['1.0.0', '1.1.0', '1.2.0', '2.0.0', '2.1.0'];

/**
 * Get a random version for demo purposes
 */
function getDemoVersion(): string {
  const randomIndex = Math.floor(Math.random() * DEMO_VERSIONS.length);
  return DEMO_VERSIONS[randomIndex];
}

/**
 * Initialize Faro for React Native demo app with Grafana Cloud
 */
export function initFaro() {
  console.log('[FARO DEBUG] Starting Faro initialization...');

  if (!FARO_COLLECTOR_URL) {
    console.warn(
      'FARO_COLLECTOR_URL not configured. Faro will not be initialized.',
    );
    return undefined;
  }

  // Get random version for demo
  const appVersion = getDemoVersion();
  console.log(`[FARO DEBUG] App version: ${appVersion}`);

  console.log('[FARO DEBUG] Creating instrumentations...');
  const instrumentations = getRNInstrumentations({
    captureConsole: true,
    trackAppState: true,
    captureErrors: true,
    trackSessions: true,
    trackViews: true,
    trackUserActions: true,
    trackHttpRequests: true,
    trackPerformance: true,
    // Performance monitoring configuration - set to 2 seconds for demo
    fetchVitalsInterval: 2000, // Collect metrics every 2 seconds (default is 30s)
  } as any);
  console.log(
    `[FARO DEBUG] Created ${instrumentations.length} instrumentations:`,
    instrumentations.map((i: any) => i.name),
  );

  const faro = initializeFaro({
    app: {
      name: 'React Native Test',
      version: appVersion,
      environment: 'production',
    },
    instrumentations: [
      // React Native specific instrumentations (equivalent to getWebInstrumentations)
      ...instrumentations,
      // Add tracing instrumentation to enable distributed tracing
      // Note: ignoreUrls are automatically extracted from transports via getIgnoreUrls()
      new TracingInstrumentation({}),
    ],
    transports: [
      new FetchTransport({
        url: FARO_COLLECTOR_URL,
      }),
      // ConsoleTransport disabled - causes infinite loop when transport fails
      // because React Native DevTools intercepts unpatchedConsole.error() calls
      new ConsoleTransport({
        level: 'info', // Use string literal instead of enum value
      }),
    ],
  } as any); // Type cast to avoid config validation issues

  // Test that Faro is working by sending a test event
  faro.api.pushEvent('faro_initialized', {
    timestamp: new Date().toISOString(),
  });

  return faro;
}
