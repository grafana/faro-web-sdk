context('Measurements', () => {
  describe('Web Vitals', () => {
    ['ttfb', 'fcp', 'cls'].forEach((expectedVital) => {
      it(`will capture ${expectedVital}`, () => {
        cy.interceptAgent((body) => {
          const item = body.measurements?.[0]!;

          if (item?.type === 'web-vitals' && Object.keys(item?.values).includes(expectedVital)) {
            return 'measurement';
          }

          return undefined;
        });

        cy.visit('/features');

        cy.get('body').click();

        cy.wait('@measurement');
      });
    });
  });

  describe('Custom', () => {
    [
      {
        title: 'custom measurement',
        btnName: 'send-custom-metric',
        metricName: 'my_custom_metric',
      },
    ].forEach(({ title, btnName, metricName }) => {
      it(`will capture ${title}`, () => {
        cy.interceptAgent((body) => {
          const item = body.measurements?.[0]!;

          if (item?.type === 'custom' && Object.keys(item?.values).includes(metricName)) {
            return 'measurement';
          }

          return undefined;
        });

        cy.visit('/features');

        cy.clickButton(`btn-${btnName}`);

        cy.wait('@measurement');
      });
    });
  });
});
