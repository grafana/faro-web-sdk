import type { MouseEventHandler } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';
import { Outlet, useNavigate } from 'react-router-dom';

import { agent } from '@grafana/agent-integration-react';

import { useLazyGetLogoutQuery } from '../../api';

export function LoggedIn() {
  const [logout] = useLazyGetLogoutQuery();

  const navigate = useNavigate();

  const onLogout: MouseEventHandler<HTMLElement> = (evt) => {
    evt.preventDefault();

    agent.api.pushEvent('logout');

    logout().then(() => {
      navigate('/');
    });
  };

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
              <LinkContainer to="/articles/add">
                <Nav.Link>Add Article</Nav.Link>
              </LinkContainer>
              {/*<LinkContainer to="/experiments/broken-page">*/}
              {/*  <Nav.Link>Broken Page</Nav.Link>*/}
              {/*</LinkContainer>*/}
              <Nav.Link onClick={onLogout}>Logout</Nav.Link>
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
