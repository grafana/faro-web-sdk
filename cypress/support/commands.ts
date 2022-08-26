import type { ExceptionEvent, LogEvent, MeasurementEvent, TraceEvent, TransportBody } from '@grafana/agent-core';
import type { EventEvent } from 'packages/core/src/api/events';

Cypress.Commands.add('waitLogs', (fn: (evts: LogEvent[]) => void) => {
  cy.wait('@logs').then((interception) => fn((interception.request.body as TransportBody).logs!));
});

Cypress.Commands.add('waitExceptions', (fn: (evts: ExceptionEvent[]) => void) => {
  cy.wait('@exceptions').then((interception) => fn((interception.request.body as TransportBody).exceptions!));
});

Cypress.Commands.add('waitTraces', (fn: (evts: TraceEvent) => void) => {
  cy.wait('@traces').then((interception) => fn((interception.request.body as TransportBody).traces!));
});

Cypress.Commands.add('waitEvents', (fn: (evts: EventEvent[]) => void) => {
  cy.wait('@events').then((interception) => fn((interception.request.body as TransportBody).events!));
});

Cypress.Commands.add('waitMeasurements', (fn: (evts: MeasurementEvent[]) => void, count = 1) => {
  const aliases = Array.from(Array(count)).map(() => `@measurements`);
  cy.wait(aliases).then((interceptions) =>
    fn(interceptions.flatMap((interception) => (interception.request.body as TransportBody).measurements!))
  );
});

Cypress.Commands.add('clickButton', (dataname: string) => {
  cy.get(`[data-cy="${dataname}"]`).click();
});

Cypress.Commands.add('loadBlank', () => {
  // can't use cy.visit() for this, it appends `about:blank' to config.baseUrl
  cy.window().then((win) => {
    win.location.href = 'about:blank';
  });
});

declare global {
  // cypress uses namespace typing so we have to extend it as well
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      waitLogs(fn: (evts: LogEvent[]) => void): Chainable<void>;
      waitExceptions(fn: (evts: ExceptionEvent[]) => void): Chainable<void>;
      waitMeasurements(fn: (evts: MeasurementEvent[]) => void, count?: number): Chainable<void>;
      waitTraces(fn: (evt: TraceEvent) => void): Chainable<void>;
      waitEvents(fn: (evts: EventEvent[]) => void): Chainable<void>;
      clickButton(dataname: string): Chainable<void>;
      loadBlank(): Chainable<void>;
    }
  }
}
