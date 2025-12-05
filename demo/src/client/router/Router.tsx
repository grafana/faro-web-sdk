import { createBrowserRouter } from 'react-router-dom';

import { withFaroRouterInstrumentation } from '@grafana/faro-react';

import { routes } from './routes';

export const router = createBrowserRouter(routes);

// Instrument the router with Faro for route change tracking
withFaroRouterInstrumentation(router);
