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
      title: 'unhandled error',
      btnName: 'fetch-error',
      value: 'Failed to fetch',
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
        const item = body.exceptions?.[0];

        if (
          item?.type === type &&
          item?.value === value &&
          ((!expectStacktrace || item?.stacktrace?.frames.length) ?? 0 > 1)
        ) {
          return 'exception';
        }

        return undefined;
      });

      cy.on('uncaught:exception', () => false);

      cy.visit('/features');

      cy.clickButton(`btn-${btnName}`);

      cy.wait('@exception');
    });
  });
});
