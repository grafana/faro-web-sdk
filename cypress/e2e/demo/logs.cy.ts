/// <reference types="cypress" />

import { LogLevel } from '../../../packages/core/src';

context('Logs', () => {

  function checkLogCaptured(level: LogLevel, message: string, expectedRequests = 4) {
    cy.collect(expectedRequests, payloads => {
      const logs = payloads.filter(b => !!b.logs)
      expect(logs).to.have.lengthOf(1)
      expect(logs[0]?.logs).to.have.lengthOf(1)
      const log = logs[0]?.logs?.[0]!
      expect(log).property('level').to.equal(level)
      expect(log).property('message').to.equal(message)
    })
  }

  it('will capture info level', () => {
    cy.get('[data-cy="btn-log-info"]').click()
    checkLogCaptured(LogLevel.INFO , 'This is a console info message')
  })

  it('will capture warn level', () => {
    cy.get('[data-cy="btn-log-warn"]').click()
    checkLogCaptured(LogLevel.WARN , 'This is a console warn message')
  })

  it('will capture error level', () => {
    cy.get('[data-cy="btn-log-error"]').click()
    checkLogCaptured(LogLevel.ERROR , 'This is a console error message')
  })
})

export {}
