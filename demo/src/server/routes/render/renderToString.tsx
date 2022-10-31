import { StrictMode } from 'react';
import SSRProvider from 'react-bootstrap/SSRProvider';
import { renderToString as reactRenderToString } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import type { FilledContext } from 'react-helmet-async';
import { Provider as ReduxProvider } from 'react-redux';
import { Routes } from 'react-router-dom';
import { StaticRouter } from 'react-router-dom/server';

import { FaroErrorBoundary, setReactRouterV6SSRDependencies } from '@grafana/faro-react';

import { App } from '../../../client/App';
import { createStore } from '../../../client/store';

setReactRouterV6SSRDependencies({ Routes });

export function renderToString(url: string, preloadedState: {}): [string, FilledContext] {
  const helmetContext: FilledContext = {} as FilledContext;

  return [
    reactRenderToString(
      <StrictMode>
        <FaroErrorBoundary>
          <ReduxProvider store={createStore(preloadedState)}>
            <HelmetProvider context={helmetContext}>
              <StaticRouter location={url}>
                <SSRProvider>
                  <App />
                </SSRProvider>
              </StaticRouter>
            </HelmetProvider>
          </ReduxProvider>
        </FaroErrorBoundary>
      </StrictMode>
    ),
    helmetContext,
  ];
}
