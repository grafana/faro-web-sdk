import type { LogEvent, TransportBody } from '@grafana/faro-core';

context('Smoke / transport', () => {
  it('pushes a log entry with the expected payload shape', () => {
    cy.interceptCollector((body: TransportBody) => {
      const log = body.logs?.find((l: LogEvent) => l.message === 'smoke harness log');
      return log ? 'log' : undefined;
    });

    cy.visit('/');
    cy.clickButton('btn-push-log');

    cy.wait('@log').then(({ request }) => {
      const body = request.body as TransportBody;
      const log = body.logs?.find((l: LogEvent) => l.message === 'smoke harness log');

      expect(log, 'captured log entry').to.exist;
      expect(log!.level, 'log.level').to.equal('info');
    });
  });
});
