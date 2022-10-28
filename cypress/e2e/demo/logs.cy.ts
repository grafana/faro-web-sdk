import { LogLevel } from '@grafana/faro-core';

context('Logs', () => {
  [LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR].forEach((level) => {
    it(`will capture ${level} level`, () => {
      cy.interceptCollector((body) => {
        const item = body.logs?.[0];

        if (item?.level === level && item?.message === `This is a console ${level} message`) {
          return 'log';
        }

        return undefined;
      });

      cy.visit('/features');

      cy.clickButton(`btn-log-${level}`);

      cy.wait('@log');
    });
  });
});
