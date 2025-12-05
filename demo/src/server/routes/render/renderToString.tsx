import { StrictMode } from 'react';
import { renderToString as reactRenderToString } from 'react-dom/server';
import { Provider as ReduxProvider } from 'react-redux';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';

import { FaroErrorBoundary } from '@grafana/faro-react';

import { routes } from '../../../client/router/routes';
import { createStore } from '../../../client/store';

const handler = createStaticHandler(routes);

export async function renderToString(url: string, preloadedState: {}): Promise<string> {
  const fetchRequest = new Request(`http://localhost${url}`, {
    method: 'GET',
  });

  const context = await handler.query(fetchRequest);

  if (context instanceof Response) {
    throw context;
  }

  const router = createStaticRouter(handler.dataRoutes, context);

  return reactRenderToString(
    <StrictMode>
      <FaroErrorBoundary>
        <ReduxProvider store={createStore(preloadedState)}>
          <StaticRouterProvider router={router} context={context} />
        </ReduxProvider>
      </FaroErrorBoundary>
    </StrictMode>
  );
}
