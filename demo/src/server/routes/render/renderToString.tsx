import { StrictMode } from 'react';
import { renderToString as reactRenderToString } from 'react-dom/server';
import { Provider as ReduxProvider } from 'react-redux';
import { Routes, StaticRouter } from 'react-router';

import { FaroErrorBoundary, FaroRoutes, setReactRouterV6SSRDependencies } from '@grafana/faro-react';

import { routes } from '../../../client/router/routes';
import { createStore } from '../../../client/store';

// Set up Faro SSR dependencies
setReactRouterV6SSRDependencies({ Routes });

export async function renderToString(url: string, preloadedState: {}): Promise<string> {
  return reactRenderToString(
    <StrictMode>
      <FaroErrorBoundary>
        <ReduxProvider store={createStore(preloadedState)}>
          <StaticRouter location={url}>
            <FaroRoutes>{routes}</FaroRoutes>
          </StaticRouter>
        </ReduxProvider>
      </FaroErrorBoundary>
    </StrictMode>
  );
}
