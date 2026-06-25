// `react-router` resolves to the v8 alias (ESM-only) via this project's mapper.
// In v8, RouterProvider moved to the `react-router/dom` entry point.
import {
  createMemoryRouter,
  createRoutesFromChildren,
  matchRoutes,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { runRouterMatrixSuite } from './shared';

runRouterMatrixSuite('v8', {
  createRoutesFromChildren,
  matchRoutes,
  Routes,
  useLocation,
  useNavigationType,
  Route,
  MemoryRouter,
  useNavigate,
  createMemoryRouter,
  RouterProvider,
});
