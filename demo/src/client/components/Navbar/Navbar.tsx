import type { MouseEventHandler } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import BootstrapNavbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';

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
          <LinkContainer to={titleTo}>
            <BootstrapNavbar.Brand>Demo</BootstrapNavbar.Brand>
          </LinkContainer>
          <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
          <BootstrapNavbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              {items.map((item) =>
                item.to ? (
                  <LinkContainer key={item.title} to={item.to}>
                    <Nav.Link>{item.title}</Nav.Link>
                  </LinkContainer>
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
