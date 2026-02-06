import { Route } from 'react-router-dom';

import { AuthWrapper } from '../App/AuthWrapper';
import { GeneralLayout } from '../layouts';
import { About, ArticleAdd, Articles, ArticleView, Features, Home, Login, Register, Seed } from '../pages';

import { LoggedInGuard, LoggedOutGuard } from './guards';

export const routes = (
  <Route element={<AuthWrapper />}>
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
      <Route index element={<Articles />} />
      <Route path="add" element={<ArticleAdd />} />
      <Route path="view/:id" element={<ArticleView />} />
    </Route>
    <Route path="*" element={<GeneralLayout />}>
      <Route index element={<Home />} />
      <Route path="about" element={<About />} />
      <Route path="features" element={<Features />} />
      <Route path="seed" element={<Seed />} />
    </Route>
  </Route>
);
