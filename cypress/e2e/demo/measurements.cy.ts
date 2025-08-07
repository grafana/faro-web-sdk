import type { MeasurementEvent } from '@grafana/faro-core';

context('Measurements', () => {
  describe('Web Vitals', () => {
    ['ttfb', 'fcp'].forEach((expectedVital) => {
      it(`will capture ${expectedVital}`, () => {
        cy.interceptCollector((body) => {
          const item = body.measurements?.find(
            (item: MeasurementEvent) => item?.type === 'web-vitals' && Object.keys(item?.values).includes(expectedVital)
          );

          return item != null ? 'measurement' : undefined;
        });

        cy.visit('/features');

        cy.reload();

        cy.clickButton('btn-log-log');

        cy.wait('@measurement', {
          timeout: 60000,
        });
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
        cy.interceptCollector((body) => {
          const item = body.measurements?.[0]!;

          if (item?.type === 'custom' && Object.keys(item?.values).includes(metricName)) {
            return 'measurement';
          }

          return undefined;
        });

        cy.visit('/features');

        cy.reload();

        cy.contains('Metrics Measurements').scrollIntoView().should('be.visible');

        const buttonName = `btn-${btnName}`;
        cy.get(`[data-cy="${buttonName}"]`).should('be.visible');
        cy.clickButton(buttonName);

        cy.wait('@measurement', {
          timeout: 60000,
        });
      });
    });
  });
});
