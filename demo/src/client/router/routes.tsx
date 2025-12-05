import type { RouteObject } from 'react-router';

import { AuthWrapper } from '../App/AuthWrapper';
import { GeneralLayout } from '../layouts';
import { About, ArticleAdd, Articles, ArticleView, Features, Home, Login, Register, Seed } from '../pages';

import { LoggedInGuard, LoggedOutGuard } from './guards';

export const routes: RouteObject[] = [
  {
    // Root layout with auth wrapper
    element: <AuthWrapper />,
    children: [
      {
        path: '/auth',
        element: (
          <LoggedOutGuard>
            <GeneralLayout />
          </LoggedOutGuard>
        ),
        children: [
          { path: 'register', element: <Register /> },
          { path: 'login', element: <Login /> },
        ],
      },
      {
        path: '/articles',
        element: (
          <LoggedInGuard>
            <GeneralLayout />
          </LoggedInGuard>
        ),
        children: [
          { path: '', element: <Articles /> },
          { path: 'add', element: <ArticleAdd /> },
          { path: 'view/:id', element: <ArticleView /> },
        ],
      },
      {
        path: '*',
        element: <GeneralLayout />,
        children: [
          { path: '', element: <Home /> },
          { path: 'about', element: <About /> },
          { path: 'features', element: <Features /> },
          { path: 'seed', element: <Seed /> },
        ],
      },
    ],
  },
];
