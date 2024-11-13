import { ExceptionEvent, LogEvent, LogLevel } from '@grafana/faro-core';

context('Console logs', () => {
  [LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR].forEach((level) => {
    it(`will capture ${level} level`, () => {
      cy.interceptCollector((body) => {
        let item =
          level === 'error'
            ? body.exceptions?.find(
                (item: ExceptionEvent) => item?.value === `console.error: This is a console ${level} message`
              )
            : body.logs?.find(
                (item: LogEvent) => item?.level === level && item?.message === `This is a console ${level} message`
              );

        return item != null ? 'log' : undefined;
      });

      cy.visit('/features');

      cy.clickButton(`btn-log-${level}`);

      cy.wait('@log');
    });
  });
});
