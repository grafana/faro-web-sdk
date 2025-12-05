import { StrictMode } from 'react';
import { renderToString as reactRenderToString } from 'react-dom/server';
import { Provider as ReduxProvider } from 'react-redux';
import { Routes } from 'react-router-dom';
import { StaticRouter } from 'react-router-dom/server';

import { FaroErrorBoundary, setReactRouterV6SSRDependencies } from '@grafana/faro-react';

import { App } from '../../../client/App';
import { createStore } from '../../../client/store';

setReactRouterV6SSRDependencies({ Routes });

export function renderToString(url: string, preloadedState: {}): string {
  return reactRenderToString(
    <StrictMode>
      <FaroErrorBoundary>
        <ReduxProvider store={createStore(preloadedState)}>
          <StaticRouter location={url}>
            <App />
          </StaticRouter>
        </ReduxProvider>
      </FaroErrorBoundary>
    </StrictMode>
  );
}
