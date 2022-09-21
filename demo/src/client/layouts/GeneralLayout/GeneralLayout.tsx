import type { MouseEvent } from 'react';
import Container from 'react-bootstrap/Container';
import { Outlet, useNavigate } from 'react-router-dom';

import { agent } from '@grafana/agent-integration-react';

import { useLazyGetLogoutQuery, useLazyGetSeedQuery } from '../../api';
import { Navbar } from '../../components';
import { useAppSelector } from '../../hooks';
import { selectIsUserLoggedIn } from '../../store';

export function GeneralLayout() {
  const isUserLoggedIn = useAppSelector(selectIsUserLoggedIn);
  const [logout] = useLazyGetLogoutQuery();
  const [seed] = useLazyGetSeedQuery();

  const navigate = useNavigate();

  return (
    <>
      <Navbar
        titleTo="/"
        items={[
          {
            title: 'About',
            to: '/about',
          },
          {
            title: 'Features Page',
            to: '/features-page',
          },
          {
            title: 'Broken Page',
            to: '/broken-page',
          },
          ...(!isUserLoggedIn
            ? [
                {
                  title: 'Seed',
                  onClick: (evt: MouseEvent<HTMLElement>) => {
                    evt.preventDefault();

                    agent.api.pushEvent('seed');

                    seed();
                  },
                },
                {
                  title: 'Login',
                  to: '/auth/login',
                },
                {
                  title: 'Register',
                  to: '/auth/register',
                },
              ]
            : [
                {
                  title: 'Articles',
                  to: '/articles',
                },
                {
                  title: 'Add Article',
                  to: '/articles/add',
                },
                {
                  title: 'Logout',
                  onClick: (evt: MouseEvent<HTMLElement>) => {
                    evt.preventDefault();

                    agent.api.pushEvent('logout');

                    logout().then(() => {
                      navigate('/');
                    });
                  },
                },
              ]),
        ]}
      />

      <Container>
        <Outlet />
      </Container>
    </>
  );
}
