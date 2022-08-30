import {
  ErrorsInstrumentation,
  GrafanaAgentRoutes,
  initializeGrafanaAgent,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/agent-integration-react';
import { TracingInstrumentation } from '@grafana/agent-tracing-web';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  createRoutesFromChildren,
  matchRoutes,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

import App from './App';
import './index.css';

initializeGrafanaAgent({
  apiKey: 'api_key',
  url: 'http://localhost:8027/collect',
  instrumentations: [
    new ErrorsInstrumentation(),
    new TracingInstrumentation({
      instrumentations: [],
    }),
    new ReactIntegration({
      router: {
        version: ReactRouterVersion.V6,
        dependencies: {
          createRoutesFromChildren,
          matchRoutes,
          Routes,
          useLocation,
          useNavigationType,
        },
      },
    }),
  ],
  app: {
    name: 'frontend',
    version: '1.0.0',
  },
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <GrafanaAgentRoutes>
        <Route path="/" element={<App />} />
        <Route path="test/:id" element={<App />} />
        <Route path="test" element={<>asdf</>} />
      </GrafanaAgentRoutes>
    </BrowserRouter>
  </StrictMode>
);

// createRoot(document.getElementById('root') as HTMLElement).render(
//   <StrictMode>
//     <Router history={history}>
//       <Switch>
//         <GrafanaAgentRoute path="/" exact>
//           <App />
//         </GrafanaAgentRoute>
//         <GrafanaAgentRoute path="/test/:id">
//           <App />
//         </GrafanaAgentRoute>
//         <GrafanaAgentRoute path="/test">asdf</GrafanaAgentRoute>
//       </Switch>
//     </Router>
//   </StrictMode>
// );

// React Router v5
// import {
//   ErrorsInstrumentation,
//   GrafanaAgentRoute,
//   initializeGrafanaAgent,
//   ReactIntegration,
//   ReactRouterVersion,
// } from '@grafana/agent-integration-react';
// import { createBrowserHistory } from 'history';
// import { Route, Router, Switch } from 'react-router-dom';
// const history = createBrowserHistory();
//
// initializeGrafanaAgent({
//   apiKey: 'api_key',
//   url: 'http://localhost:8027/collect',
//   instrumentations: [
//     new ErrorsInstrumentation(),
//     new TracingInstrumentation({
//       instrumentations: [],
//     }),
//     new ReactIntegration({
//       router: {
//         version: ReactRouterVersion.V5,
//         dependencies: {
//           history,
//           Route,
//         } as any,
//       },
//     }),
//   ],
//   app: {
//     name: 'frontend',
//     version: '1.0.0',
//   },
// });
//
// createRoot(document.getElementById('root') as HTMLElement).render(
//   <StrictMode>
//     <Router history={history}>
//       <Switch>
//         <GrafanaAgentRoute path="/" exact>
//           <App />
//         </GrafanaAgentRoute>
//         <GrafanaAgentRoute path="/test/:id">
//           <App />
//         </GrafanaAgentRoute>
//         <GrafanaAgentRoute path="/test">asdf</GrafanaAgentRoute>
//       </Switch>
//     </Router>
//   </StrictMode>
// );
