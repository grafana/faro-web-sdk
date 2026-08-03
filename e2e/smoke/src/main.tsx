import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import {
  FaroErrorBoundary,
  getWebInstrumentations,
  initializeFaro,
  LogLevel,
  ReactIntegration,
} from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

// Opt-in via ?session=persistent so the session specs don't affect other smoke specs.
const params = new URLSearchParams(window.location.search);
const persistentSession = params.get('session') === 'persistent';
const sessionTracking = persistentSession ? { enabled: true, persistent: true } : undefined;

// Session signals only for the persistent scenario: web vitals/tracing/React
// would emit on their own and rotate the session mid-test (non-deterministic).
const instrumentations = persistentSession
  ? [...getWebInstrumentations()]
  : [...getWebInstrumentations(), new ReactIntegration(), new TracingInstrumentation()];

const faro = initializeFaro({
  url: '/collect',
  app: {
    name: 'faro-web-sdk-smoke',
    version: '0.0.0',
    environment: 'test',
  },
  instrumentations,
  ...(sessionTracking ? { sessionTracking } : {}),
});

function Thrower() {
  const [explode, setExplode] = useState(false);

  if (explode) {
    throw new Error('smoke harness boundary error');
  }

  return (
    <button data-cy="btn-throw-error" onClick={() => setExplode(true)}>
      Throw inside FaroErrorBoundary
    </button>
  );
}

function App() {
  return (
    <main>
      <h1>Faro Web SDK smoke harness</h1>
      <button data-cy="btn-push-log" onClick={() => faro.api.pushLog(['smoke harness log'], { level: LogLevel.INFO })}>
        Push log
      </button>
      <button
        data-cy="btn-push-event"
        onClick={() => faro.api.pushEvent('smoke-harness-event', { source: 'smoke-harness' })}
      >
        Push event
      </button>
      <button
        data-cy="btn-push-measurement"
        onClick={() =>
          faro.api.pushMeasurement({ type: 'smoke-harness-measurement', values: { duration: 42, count: 1 } })
        }
      >
        Push measurement
      </button>
      <button data-cy="btn-push-error" onClick={() => faro.api.pushError(new Error('smoke harness pushError'))}>
        Push error via API
      </button>
      <button
        data-cy="btn-emit-span"
        onClick={() => {
          const otel = faro.api.getOTEL();
          if (!otel) {
            return;
          }
          const span = otel.trace.getTracer('smoke-harness').startSpan('smoke-harness-span');
          span.end();
        }}
      >
        Emit OTel span
      </button>
      <FaroErrorBoundary>
        <Thrower />
      </FaroErrorBoundary>
    </main>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
