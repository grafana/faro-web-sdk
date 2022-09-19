import type { MouseEventHandler } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import BootstrapNavbar from 'react-bootstrap/Navbar';
import { LinkContainer } from 'react-router-bootstrap';

export type NavbarProps = {
  items: Array<{
    title: string;

    onClick?: MouseEventHandler<HTMLAnchorElement>;
    to?: string;
  }>;
  titleTo: string;
};

export function Navbar({ items, titleTo }: NavbarProps) {
  return (
    <>
      <BootstrapNavbar bg="dark" variant="dark" expand="lg" className="mb-3">
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
    </>
  );
}
