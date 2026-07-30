// This project pins react/react-dom to v18 (RR v5 does not run on React 19) and
// uses the real react-router-dom@5 + history@4 aliases.
import { act, render } from '@testing-library/react';
import { createMemoryHistory } from 'history-v4';
import React from 'react';
import { Route, Router, Switch } from 'react-router-dom-v5';

import { FaroRoute } from '../v4v5/FaroRoute';
import { initializeReactRouterV4V5Instrumentation } from '../v4v5/initialize';

import { installFaroApiMock } from './faroApiMock';

describe('react-router v5', () => {
  let faro: ReturnType<typeof installFaroApiMock>;

  beforeEach(() => {
    faro = installFaroApiMock();
  });

  // The v4/v5 instrumentation builds an "active event" whose route is filled in
  // by <FaroRoute> as it renders, and flushes it on the NEXT navigation. So to
  // observe the pattern for a page, we navigate away from it.
  it('emits the matched route pattern of the page being left on navigation', () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });

    initializeReactRouterV4V5Instrumentation({ history, Route });

    render(
      <Router history={history}>
        <Switch>
          <FaroRoute exact path="/" />
          <FaroRoute path="/users/:id" />
          <FaroRoute path="/teams/:id" />
        </Switch>
      </Router>
    );

    act(() => {
      history.push('/users/42');
    });
    act(() => {
      history.push('/teams/7');
    });

    const routes = faro.routeChanges().map((call) => call.attributes?.route);
    expect(routes).toEqual(['/', '/users/:id']);
  });
});
