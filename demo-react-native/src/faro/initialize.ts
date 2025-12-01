import { initializeFaro, getRNInstrumentations, FetchTransport } from '@grafana/faro-react-native';

/**
 * Initialize Faro for React Native demo app
 */
export function initFaro() {
  const faro = initializeFaro({
    url: 'https://faro-collector-example.com/collect', // Replace with your collector URL
    apiKey: 'demo-api-key', // Replace with your API key
    app: {
      name: 'faro-react-native-demo',
      version: '1.0.0',
      environment: 'development',
    },
    instrumentations: [
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
        url: 'https://faro-collector-example.com/collect',
        apiKey: 'demo-api-key',
      }),
    ],
  });

  console.log('Faro initialized:', faro);
  return faro;
}
