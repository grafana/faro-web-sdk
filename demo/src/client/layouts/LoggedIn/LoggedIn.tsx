import { useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';
import { Outlet, useNavigate } from 'react-router-dom';

import { useLazyGetLogoutQuery } from '../../api';
import { useAppDispatch } from '../../hooks';
import { setUser } from '../../store';

export function LoggedIn() {
  const dispatch = useAppDispatch();

  const [logout, logoutResult] = useLazyGetLogoutQuery();

  const navigate = useNavigate();

  useEffect(() => {
    if (!logoutResult.isUninitialized && !logoutResult.isLoading) {
      dispatch(setUser(null));

      navigate('/');
    }
  }, [dispatch, logoutResult, navigate]);

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-3">
        <Container>
          <LinkContainer to="/articles">
            <Navbar.Brand>Demo</Navbar.Brand>
          </LinkContainer>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <LinkContainer to="/articles">
                <Nav.Link>Articles</Nav.Link>
              </LinkContainer>
              <Nav.Link
                onClick={(evt) => {
                  evt.preventDefault();

                  logout();
                }}
              >
                Logout
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container>
        <Outlet />
      </Container>
    </>
  );
}
