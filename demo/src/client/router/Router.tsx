import { GrafanaAgentRoutes } from '@grafana/agent-integration-react';
import { lazy } from 'react';
import { Route } from 'react-router-dom';

import { LoggedInGuard, LoggedOutGuard } from './guards';
import { Loadable } from './Loadable';

export function getLoadableLayout(key: string) {
  return Loadable(lazy(() => import(`../layouts/${key}/${key}.tsx`).then((module) => ({ default: module[key] }))));
}

export function getLoadablePage(key: string) {
  return Loadable(lazy(() => import(`../pages/${key}/${key}.tsx`).then((module) => ({ default: module[key] }))));
}

const LoggedIn = getLoadableLayout('LoggedIn');
const LoggedOut = getLoadableLayout('LoggedOut');

const About = getLoadablePage('About');
const ArticleAdd = getLoadablePage('ArticleAdd');
const Articles = getLoadablePage('Articles');
const ArticleView = getLoadablePage('ArticleView');
const Home = getLoadablePage('Home');
const Login = getLoadablePage('Login');
const Register = getLoadablePage('Register');

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
