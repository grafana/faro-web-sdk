import type { TransportBody } from '@grafana/faro-core';

Cypress.Commands.add('interceptCollector', (aliasGenerator) => {
  cy.intercept('POST', '**/collect', (req) => {
    req.alias = aliasGenerator(req.body as TransportBody);

    req.reply({
      statusCode: 201,
      body: {},
    });
  });
});

Cypress.Commands.add('clickButton', (btnId) => {
  cy.get(`[data-cy="${btnId}"]`).click({ force: true });
});

declare global {
  // cypress uses namespace typing so we have to extend it as well
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      clickButton(btnId: string): Chainable<void>;
      interceptCollector(aliasGenerator: (body: TransportBody) => string | undefined): Chainable<void>;
    }
  }
}
