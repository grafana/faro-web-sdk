import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { RouterProvider } from 'react-router';

import { FaroErrorBoundary } from '@grafana/faro-react';

import { initializeFaro } from './faro';
import { router } from './router';
import { createStore } from './store';

initializeFaro();

hydrateRoot(
  document.getElementById('app') as HTMLElement,
  <StrictMode>
    <FaroErrorBoundary>
      <ReduxProvider store={createStore((window as any).__PRELOADED_STATE__)}>
        <RouterProvider router={router} />
      </ReduxProvider>
    </FaroErrorBoundary>
  </StrictMode>
);
