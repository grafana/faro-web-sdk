import type { ExceptionEvent, TransportBody } from '@grafana/faro-core';

context('Smoke / pushError', () => {
  it('pushes an exception via the faro.api.pushError API', () => {
    cy.interceptCollector((body: TransportBody) => {
      const exception = body.exceptions?.find((e: ExceptionEvent) => e.value === 'smoke harness pushError');
      return exception ? 'exception' : undefined;
    });

    cy.visit('/');
    cy.clickButton('btn-push-error');

    cy.wait('@exception').then(({ request }) => {
      const body = request.body as TransportBody;
      const exception = body.exceptions?.find((e: ExceptionEvent) => e.value === 'smoke harness pushError');

      expect(exception, 'captured exception').to.exist;
      expect(exception!.type, 'exception.type').to.equal('Error');
    });
  });
});
