import type { EventEvent, TransportBody } from '@grafana/faro-core';

context('Smoke / events', () => {
  it('pushes an event with the expected name and attributes', () => {
    cy.interceptCollector((body: TransportBody) => {
      const event = body.events?.find((e: EventEvent) => e.name === 'smoke-harness-event');
      return event ? 'event' : undefined;
    });

    cy.visit('/');
    cy.clickButton('btn-push-event');

    cy.wait('@event').then(({ request }) => {
      const body = request.body as TransportBody;
      const event = body.events?.find((e: EventEvent) => e.name === 'smoke-harness-event');

      expect(event, 'captured event').to.exist;
      expect(event!.attributes?.['source'], 'event.attributes.source').to.equal('smoke-harness');
    });
  });
});
