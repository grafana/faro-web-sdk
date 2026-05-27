import type { TransportBody } from '@grafana/faro-core';

context('Smoke / init', () => {
  it('populates browser and app meta on transport POSTs', () => {
    cy.interceptCollector((body: TransportBody) => {
      const hasBrowser = Boolean(body.meta.browser?.name && body.meta.browser?.userAgent);
      const hasApp = body.meta.app?.name === 'faro-web-sdk-smoke';

      return hasBrowser && hasApp ? 'init' : undefined;
    });

    cy.visit('/');

    cy.wait('@init').then(({ request }) => {
      const body = request.body as TransportBody;

      expect(body.meta.app?.name, 'meta.app.name').to.equal('faro-web-sdk-smoke');
      expect(body.meta.browser?.name, 'meta.browser.name').to.be.a('string').and.not.empty;
      expect(body.meta.browser?.userAgent, 'meta.browser.userAgent').to.be.a('string').and.not.empty;
    });
  });
});
