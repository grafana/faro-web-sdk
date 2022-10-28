import { StrictMode } from 'react';
import SSRProvider from 'react-bootstrap/SSRProvider';
import { hydrateRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { Provider as ReduxProvider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import { GrafanaAgentErrorBoundary } from '@grafana/faro-react';

import { App } from './App';
import { initializeGrafanaAgent } from './grafanaAgent';
import { createStore } from './store';

initializeGrafanaAgent();

hydrateRoot(
  document.getElementById('app') as HTMLElement,
  <StrictMode>
    <GrafanaAgentErrorBoundary>
      <ReduxProvider store={createStore((window as any).__PRELOADED_STATE__)}>
        <HelmetProvider>
          <BrowserRouter>
            <SSRProvider>
              <App />
            </SSRProvider>
          </BrowserRouter>
        </HelmetProvider>
      </ReduxProvider>
    </GrafanaAgentErrorBoundary>
  </StrictMode>
);
