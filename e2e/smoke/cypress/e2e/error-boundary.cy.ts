import type { ExceptionEvent, TransportBody } from '@grafana/faro-core';

context('Smoke / FaroErrorBoundary', () => {
  it('captures and pushes errors thrown inside a FaroErrorBoundary', () => {
    cy.interceptCollector((body: TransportBody) => {
      const exception = body.exceptions?.find((e: ExceptionEvent) => e.value === 'smoke harness boundary error');
      return exception ? 'exception' : undefined;
    });

    cy.visit('/');
    cy.on('uncaught:exception', () => false);
    cy.clickButton('btn-throw-error');

    cy.wait('@exception').then(({ request }) => {
      const body = request.body as TransportBody;
      const exception = body.exceptions?.find((e: ExceptionEvent) => e.value === 'smoke harness boundary error');

      expect(exception, 'captured exception').to.exist;
      expect(exception!.type, 'exception.type').to.be.a('string').and.not.empty;
    });
  });
});
