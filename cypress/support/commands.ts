import type { ExceptionEvent } from 'packages/core/dist';
import type { LogEvent, MeasurementEvent, TraceEvent, TransportBody } from 'packages/core/src';

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

Cypress.Commands.add('waitLogs', (fn: (events: LogEvent[]) => void) => {
  cy.wait('@logs').then(interception => fn((interception.request.body as TransportBody).logs!))
})

Cypress.Commands.add('waitExceptions', (fn: (events: ExceptionEvent[]) => void) => {
  cy.wait('@exceptions').then(interception => fn((interception.request.body as TransportBody).exceptions!))
})

Cypress.Commands.add('waitTraces', (fn: (event: TraceEvent) => void) => {
  cy.wait('@traces').then(interception => fn((interception.request.body as TransportBody).traces!))
})

Cypress.Commands.add('waitMeasurements', (fn: (events: MeasurementEvent[]) => void, count = 1) => {
  const aliases = Array.from(Array(count)).map(() => `@measurements`)
  cy.wait(aliases).then(interceptions => fn((interceptions.flatMap(interception => (interception.request.body as TransportBody).measurements!))))
})

Cypress.Commands.add('clickButton', (dataname: string) => {
  cy.get(`[data-cy="${dataname}"]`).click()
})

Cypress.Commands.add('loadBlank', () => {
  // can't use cy.visit() for this, it appends `about:blank' to config.baseUrl
  cy.window().then((win) => {
    win.location.href = 'about:blank'
  })
})

declare global {
   namespace Cypress {
     interface Chainable {
      waitLogs(fn: (events: LogEvent[]) => void): Chainable<void>
      waitExceptions(fn: (events: ExceptionEvent[]) => void): Chainable<void>
      waitMeasurements(fn: (events: MeasurementEvent[]) => void, count?: number): Chainable<void>
      waitTraces(fn: (event: TraceEvent) => void): Chainable<void>
      clickButton(dataname: string): Chainable<void>
      loadBlank(): Chainable<void>
    }
   }
}

export {};
