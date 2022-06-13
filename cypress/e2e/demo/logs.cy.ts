import { LogLevel } from '../../../packages/core/src';

context('Logs', () => {

  function checkLogCaptured(level: LogLevel, message: string) {
    cy.waitLogs(logs => {
      expect(logs).to.have.lengthOf(1)
      const log = logs[0]!
      expect(log).property('level').to.equal(level)
      expect(log).property('message').to.equal(message)
    })
  }

  it('will capture info level', () => {
    cy.clickButton('btn-log-info')
    checkLogCaptured(LogLevel.INFO , 'This is a console info message')
  })

  it('will capture warn level', () => {
    cy.clickButton('btn-log-warn')
    checkLogCaptured(LogLevel.WARN , 'This is a console warn message')
  })

  it('will capture error level', () => {
    cy.clickButton('btn-log-error')
    checkLogCaptured(LogLevel.ERROR , 'This is a console error message')
  })
})

export {}
