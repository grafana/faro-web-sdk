import { ExceptionEvent } from '@grafana/faro-core';

context('Errors', () => {
  [
    {
      title: 'thrown errors',
      btnName: 'throw-error',
      value: 'This is a thrown error',
    },
    {
      title: 'unexpected errors',
      btnName: 'call-undefined',
      value: 'test is not defined',
    },
    {
      title: 'unhandled fetch error',
      btnName: 'fetch-error',
      value: 'Failed to fetch',
    },
    {
      title: 'unhandled xhr error',
      btnName: 'xhr-error',
      value: 'Network error',
    },
    {
      title: 'unhandled rejection',
      type: 'UnhandledRejection',
      btnName: 'promise-reject',
      value: 'Non-Error promise rejection captured with value: This is a rejected promise',
      expectStacktrace: false,
    },
  ].forEach(({ title, btnName, type = 'Error', value, expectStacktrace = true }) => {
    it(`will capture ${title}`, () => {
      cy.interceptCollector((body) => {
        const item = body.exceptions?.find(
          (item: ExceptionEvent) =>
            item?.type === type &&
            item?.value === value &&
            ((!expectStacktrace || item?.stacktrace?.frames.length) ?? 0 > 1)
        );

        return item != null ? 'exception' : undefined;
      }).as('exception');

      cy.on('uncaught:exception', () => false);

      cy.visit('/features');

      cy.clickButton(`btn-${btnName}`);

      cy.wait('@exception');
    });
  });
});
