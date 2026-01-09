import type { MouseEventHandler } from 'react';
import { Navbar as BootstrapNavbar, Container, Nav } from 'react-bootstrap';
import { NavLink } from 'react-router';

import { useAppSelector } from '../../hooks';
import { selectRootSpanId, selectRootTraceId, selectSession } from '../../store';

export type NavbarProps = {
  items: Array<{
    title: string;

    onClick?: MouseEventHandler<HTMLAnchorElement>;
    to?: string;
  }>;
  titleTo: string;
};

export function Navbar({ items, titleTo }: NavbarProps) {
  const session = useAppSelector(selectSession);
  const rootSpanId = useAppSelector(selectRootSpanId);
  const rootTraceId = useAppSelector(selectRootTraceId);

  return (
    <>
      <BootstrapNavbar bg="dark" variant="dark" expand="lg">
        <Container>
          <NavLink to={titleTo} className="navbar-brand" end>
            Demo
          </NavLink>
          <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
          <BootstrapNavbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {items.map((item) =>
                item.to ? (
                  <NavLink
                    key={item.title}
                    to={item.to}
                    className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  >
                    {item.title}
                  </NavLink>
                ) : (
                  <Nav.Link key={item.title} onClick={item.onClick}>
                    {item.title}
                  </Nav.Link>
                )
              )}
            </Nav>
          </BootstrapNavbar.Collapse>
        </Container>
      </BootstrapNavbar>
      <BootstrapNavbar bg="light" className="mb-3">
        <Container className="flex-column align-items-start flex-lg-row">
          <BootstrapNavbar.Text>
            <b>Session ID:</b>
            <br />
            {session?.id ?? 'Unknown'}
          </BootstrapNavbar.Text>
          <BootstrapNavbar.Text>
            <b>Span ID:</b>
            <br />
            {rootSpanId ?? 'Unknown'}
          </BootstrapNavbar.Text>
          <BootstrapNavbar.Text>
            <b>Trace ID:</b>
            <br />
            {rootTraceId ?? 'Unknown'}
          </BootstrapNavbar.Text>
        </Container>
      </BootstrapNavbar>
    </>
  );
}
