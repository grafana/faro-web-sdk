// `react-router` resolves to the plain devDependency (7.x) in this project.
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

runRouterMatrixSuite('v7', {
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
