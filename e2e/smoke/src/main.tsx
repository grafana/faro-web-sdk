import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import {
  FaroErrorBoundary,
  getWebInstrumentations,
  initializeFaro,
  LogLevel,
  ReactIntegration,
} from '@grafana/faro-react';

const faro = initializeFaro({
  url: '/collect',
  app: {
    name: 'faro-web-sdk-smoke',
    version: '0.0.0',
    environment: 'test',
  },
  instrumentations: [...getWebInstrumentations(), new ReactIntegration()],
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
