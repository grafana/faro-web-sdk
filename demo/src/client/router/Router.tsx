import { BrowserRouter } from 'react-router-dom';

import { FaroRoutes } from '@grafana/faro-react';

import { routes } from './routes';

export function Router() {
  return (
    <BrowserRouter>
      <FaroRoutes>{routes}</FaroRoutes>
    </BrowserRouter>
  );
}
