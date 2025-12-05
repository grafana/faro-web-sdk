import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import { FaroErrorBoundary } from '@grafana/faro-react';

import { App } from './App';
import { initializeFaro } from './faro';
import { createStore } from './store';

initializeFaro();

hydrateRoot(
  document.getElementById('app') as HTMLElement,
  <StrictMode>
    <FaroErrorBoundary>
      <ReduxProvider store={createStore((window as any).__PRELOADED_STATE__)}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ReduxProvider>
    </FaroErrorBoundary>
  </StrictMode>
);
