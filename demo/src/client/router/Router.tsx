import { Route } from 'react-router-dom';

import { GrafanaAgentRoutes } from '@grafana/agent-integration-react';

import { GeneralLayout } from '../layouts';
import { About, ArticleAdd, Articles, ArticleView, BrokenPage, Home, Login, Register } from '../pages';
import { FeaturesPage } from '../pages/FeaturesPage';
import { LoggedInGuard, LoggedOutGuard } from './guards';

export function Router() {
  return (
    <GrafanaAgentRoutes>
      <Route
        path="/auth"
        element={
          <LoggedOutGuard>
            <GeneralLayout />
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
            <GeneralLayout />
          </LoggedInGuard>
        }
      >
        <Route path="" element={<Articles />} />
        <Route path="add" element={<ArticleAdd />} />
        <Route path="view/:id" element={<ArticleView />} />
      </Route>

      <Route path="*" element={<GeneralLayout />}>
        <Route path="" element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="features-page" element={<FeaturesPage />} />
        <Route path="broken-page" element={<BrokenPage />} />
      </Route>
    </GrafanaAgentRoutes>
  );
}
