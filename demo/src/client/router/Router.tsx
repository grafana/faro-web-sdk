import { Route } from 'react-router-dom';

import { GrafanaAgentRoutes } from '@grafana/agent-integration-react';

import { LoggedIn } from '../layouts/LoggedIn';
import { LoggedOut } from '../layouts/LoggedOut';
import { About } from '../pages/About';
import { ArticleAdd } from '../pages/ArticleAdd';
import { Articles } from '../pages/Articles';
import { ArticleView } from '../pages/ArticleView';
import { BrokenPage } from '../pages/BrokenPage';
import { Home } from '../pages/Home';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { LoggedInGuard, LoggedOutGuard } from './guards';

export function Router() {
  return (
    <GrafanaAgentRoutes>
      <Route
        path="/auth"
        element={
          <LoggedOutGuard>
            <LoggedOut />
          </LoggedOutGuard>
        }
      >
        <Route path="register" element={<Register />} />
        <Route path="login" element={<Login />} />
      </Route>

      <Route
        path="/articles"
        element={
          <LoggedInGuard>
            <LoggedIn />
          </LoggedInGuard>
        }
      >
        <Route path="" element={<Articles />} />
        <Route path="add" element={<ArticleAdd />} />
        <Route path="view/:id" element={<ArticleView />} />
      </Route>

      <Route
        path="/experiments"
        element={
          <LoggedInGuard>
            <LoggedIn />
          </LoggedInGuard>
        }
      >
        <Route path="broken-page" element={<BrokenPage />} />
      </Route>

      <Route
        path="*"
        element={
          <LoggedOutGuard>
            <LoggedOut />
          </LoggedOutGuard>
        }
      >
        <Route path="" element={<Home />} />
        <Route path="about" element={<About />} />
      </Route>
    </GrafanaAgentRoutes>
  );
}
