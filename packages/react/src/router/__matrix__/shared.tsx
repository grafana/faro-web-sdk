import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { FaroRoutes } from '../v6v7/FaroRoutes';
import {
  initializeReactRouterV6DataRouterInstrumentation,
  initializeReactRouterV6Instrumentation,
} from '../v6v7/initialize';
import { getRouteFromLocation } from '../v6v7/utils';
import { withFaroRouterInstrumentation } from '../v6v7/withFaroRouterInstrumentation';

import { installFaroApiMock } from './faroApiMock';

/**
 * Version-specific react-router exports injected by each `vN.test.tsx`. The
 * hooks/components must all originate from the SAME react-router instance so
 * that the router context resolves correctly during rendering.
 */
export interface RouterMatrixDeps {
  // Injected into faro's dependency holder (what the instrumentation actually calls).
  createRoutesFromChildren: any;
  matchRoutes: any;
  Routes: any;
  useLocation: any;
  useNavigationType: any;
  // Used by the tests to build route trees, render and navigate.
  Route: any;
  MemoryRouter: any;
  useNavigate: any;
  createMemoryRouter: any;
  RouterProvider: any;
}

function loc(pathname: string) {
  return { pathname, search: '', hash: '', state: null, key: 'test' };
}

export function runRouterMatrixSuite(version: string, deps: RouterMatrixDeps): void {
  const {
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
  } = deps;

  const v6Deps = { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType };

  describe(`react-router ${version}`, () => {
    let faro: ReturnType<typeof installFaroApiMock>;

    beforeEach(() => {
      faro = installFaroApiMock();
    });

    describe('getRouteFromLocation (real matchRoutes)', () => {
      beforeEach(() => {
        initializeReactRouterV6Instrumentation(v6Deps);
      });

      it('resolves a dynamic param to its route pattern', () => {
        const routes = createRoutesFromChildren(<Route path="/users/:id" element={<i />} />);

        expect(getRouteFromLocation(routes, loc('/users/42'))).toBe('/users/:id');
      });

      it('resolves a nested dynamic param to the full pattern', () => {
        const routes = createRoutesFromChildren(
          <Route path="users" element={<i />}>
            <Route path=":id" element={<i />} />
          </Route>
        );

        expect(getRouteFromLocation(routes, loc('/users/42'))).toBe('/users/:id');
      });

      it('falls back to the raw pathname when nothing matches', () => {
        const routes = createRoutesFromChildren(<Route path="/users/:id" element={<i />} />);

        expect(getRouteFromLocation(routes, loc('/nope'))).toBe('/nope');
      });
    });

    describe('FaroRoutes (component routes)', () => {
      beforeEach(() => {
        initializeReactRouterV6Instrumentation(v6Deps);
      });

      it('emits a route_change with the route pattern on navigation', () => {
        function Nav() {
          const navigate = useNavigate();
          return (
            <button type="button" onClick={() => navigate('/users/42')}>
              go
            </button>
          );
        }

        const { getByText } = render(
          <MemoryRouter initialEntries={['/']}>
            <Nav />
            <FaroRoutes>
              <Route path="/" element={<div>home</div>} />
              <Route path="/users/:id" element={<div>user</div>} />
            </FaroRoutes>
          </MemoryRouter>
        );

        fireEvent.click(getByText('go'));

        const changes = faro.routeChanges();
        const last = changes[changes.length - 1];
        expect(last?.attributes?.toRoute).toBe('/users/:id');
      });

      it('threads the previous route into fromRoute on a second navigation', () => {
        function Nav() {
          const navigate = useNavigate();
          return (
            <>
              <button type="button" onClick={() => navigate('/users/1')}>
                first
              </button>
              <button type="button" onClick={() => navigate('/teams/2')}>
                second
              </button>
            </>
          );
        }

        const { getByText } = render(
          <MemoryRouter initialEntries={['/']}>
            <Nav />
            <FaroRoutes>
              <Route path="/" element={<div>home</div>} />
              <Route path="/users/:id" element={<div>user</div>} />
              <Route path="/teams/:id" element={<div>team</div>} />
            </FaroRoutes>
          </MemoryRouter>
        );

        fireEvent.click(getByText('first'));
        fireEvent.click(getByText('second'));

        const last = faro.routeChanges().at(-1);
        expect(last?.attributes?.toRoute).toBe('/teams/:id');
        expect(last?.attributes?.fromRoute).toBe('/users/:id');
      });
    });

    describe('withFaroRouterInstrumentation (data router)', () => {
      it('emits a route_change with the route pattern on navigation', async () => {
        initializeReactRouterV6DataRouterInstrumentation({ matchRoutes });

        const router = createMemoryRouter(
          [
            { path: '/', element: <div>home</div> },
            { path: '/users/:id', element: <div>user</div> },
          ],
          { initialEntries: ['/'] }
        );

        withFaroRouterInstrumentation(router);

        render(<RouterProvider router={router} />);

        await act(async () => {
          await router.navigate('/users/42');
        });

        const last = faro.routeChanges().at(-1);
        expect(last?.attributes?.toRoute).toBe('/users/:id');
      });
    });
  });
}
