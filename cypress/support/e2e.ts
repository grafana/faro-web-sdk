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
import type { TransportBody } from 'packages/core/src';
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')


beforeEach(() => {
  cy.intercept('POST', '**/collect', req => {
    const body = req.body as TransportBody
    if (body.exceptions?.length) {
      req.alias = 'exceptions'
    } else if (body.logs?.length) {
      req.alias = 'logs'
    } else if (body.traces) {
      req.alias = 'traces'
    } else if (body.measurements?.length) {
      req.alias = 'measurements'
    }
    req.reply({
      statusCode: 201,
      body: {},
    })
  })
  cy.visit('/')
})

afterEach(() => cy.loadBlank())
