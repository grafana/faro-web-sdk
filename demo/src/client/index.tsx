import React, { StrictMode, useEffect } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';
import { RouterProvider } from 'react-router';

import { faro, FaroErrorBoundary } from '@grafana/faro-react';

import { initializeFaro } from './faro';
import { router } from './router';
import { createStore, setSession } from './store';

initializeFaro();

function App(props: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  useEffect(() => {
    const session = faro.api.getSession();
    if (session) {
      dispatch(setSession(session));
    }
  }, [dispatch]);
  return <>{props.children}</>;
}
hydrateRoot(
  document.getElementById('app') as HTMLElement,

  <StrictMode>
    <FaroErrorBoundary>
      <ReduxProvider store={createStore((window as any).__PRELOADED_STATE__)}>
        <App>
          <RouterProvider router={router} />
        </App>
      </ReduxProvider>
    </FaroErrorBoundary>
  </StrictMode>
);
