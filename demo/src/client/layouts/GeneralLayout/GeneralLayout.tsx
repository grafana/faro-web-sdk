import type { MouseEvent } from 'react';
import Container from 'react-bootstrap/Container';
import { Outlet, useNavigate } from 'react-router-dom';

import { faro } from '@grafana/faro-react';

import { useLazyGetLogoutQuery } from '../../api';
import { Navbar } from '../../components';
import { useAppSelector } from '../../hooks';
import { selectIsUserLoggedIn } from '../../store';

export function GeneralLayout() {
  const isUserLoggedIn = useAppSelector(selectIsUserLoggedIn);
  const [logout] = useLazyGetLogoutQuery();

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
            title: 'Features',
            to: '/features',
          },
          ...(!isUserLoggedIn
            ? [
                {
                  title: 'Seed',
                  to: '/seed',
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

                    faro.api.pushEvent('logout');

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
