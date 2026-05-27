import type { MeasurementEvent, TransportBody } from '@grafana/faro-core';

context('Smoke / measurements', () => {
  it('pushes a measurement with the expected type and values', () => {
    cy.interceptCollector((body: TransportBody) => {
      const measurement = body.measurements?.find((m: MeasurementEvent) => m.type === 'smoke-harness-measurement');
      return measurement ? 'measurement' : undefined;
    });

    cy.visit('/');
    cy.clickButton('btn-push-measurement');

    cy.wait('@measurement').then(({ request }) => {
      const body = request.body as TransportBody;
      const measurement = body.measurements?.find((m: MeasurementEvent) => m.type === 'smoke-harness-measurement');

      expect(measurement, 'captured measurement').to.exist;
      expect(measurement!.values['duration'], 'measurement.values.duration').to.equal(42);
      expect(measurement!.values['count'], 'measurement.values.count').to.equal(1);
    });
  });
});
