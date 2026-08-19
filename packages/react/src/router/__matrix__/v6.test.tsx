// `react-router` resolves to the v6 alias via this project's moduleNameMapper.
import {
  createMemoryRouter,
  createRoutesFromChildren,
  matchRoutes,
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router';

import { runRouterMatrixSuite } from './shared';

runRouterMatrixSuite('v6', {
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
