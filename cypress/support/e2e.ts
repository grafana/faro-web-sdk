// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')


beforeEach(() => {
  cy.intercept('POST', '**/collect', {
    statusCode: 201,
    body: {},
  }).as('collector')
  cy.visit('/')
})

afterEach(() => {
  cy.window().then((win) => {
    win.location.href = 'about:blank'
  })
  //cy.wait(1500)
})
