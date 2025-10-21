import type { EventEvent, TransportBody } from '@grafana/faro-core';

context('User Actions', () => {
  it('captures user-action-1-custom-event-2 without action attribution when halted', () => {
    cy.interceptCollector((body: TransportBody) => {
      const item = body.events?.find?.((e: EventEvent) => e.name === 'user-action-1-custom-event-2');

      // Only alias when the event is present and there is no action attribution
      return item && (item as unknown as { action?: unknown }).action == null ? 'ua-no-action' : undefined;
    });

    cy.visit('/features');

    cy.clickButton('btn-ua-1');

    cy.wait('@ua-no-action');
  });
});
