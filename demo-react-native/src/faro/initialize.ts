import { FARO_COLLECTOR_URL } from '@env';

import {
  FetchTransport,
  getRNInstrumentations,
  initializeFaro,
} from '@grafana/faro-react-native';

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
      }),
    ],
    transports: [
      new FetchTransport({
        url: FARO_COLLECTOR_URL,
      }),
    ],
  });

  console.log('Faro initialized successfully for React Native');
  return faro;
}
