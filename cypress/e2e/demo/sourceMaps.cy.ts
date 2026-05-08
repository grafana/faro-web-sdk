import { ExceptionEvent } from '@grafana/faro-core';

context('Source maps', () => {
  it('serves a `.map` alongside the bundle chunk that Faro reports as the error origin', () => {
    let capturedFilename: string | undefined;

    cy.interceptCollector((body) => {
      const exception = body.exceptions?.find(
        (item: ExceptionEvent) =>
          item.type === 'Error' &&
          item.value === 'This is a thrown error' &&
          (item.stacktrace?.frames.length ?? 0) > 0
      );

      const filename = exception?.stacktrace?.frames[0]?.filename;
      if (filename) {
        capturedFilename = filename;
        return 'exception';
      }

      return undefined;
    }).as('exception');

    cy.on('uncaught:exception', () => false);

    cy.visit('/features');
    cy.clickButton('btn-throw-error');
    cy.wait('@exception');

    // The captured frame points at a built JS chunk. Its matching `.map` must be
    // served by the demo so Alloy's faro.receiver can symbolicate stack frames
    // back to the original TypeScript source. Without `build.sourcemap: true` in
    // `demo/vite.config.ts`, the `.map` would 404 and symbolication would silently
    // fail — see grafana/faro-web-sdk#2043.
    cy.then(() => {
      expect(capturedFilename, 'first stack frame should have a filename').to.exist;

      const sourceUrl = capturedFilename!.split('?')[0];
      const mapUrl = `${sourceUrl}.map`;

      cy.request(sourceUrl).its('status').should('eq', 200);
      cy.request(mapUrl).then((res) => {
        expect(res.status, `expected ${mapUrl} to be served`).to.eq(200);
        expect(res.headers['content-type']).to.match(/json/);
      });
    });
  });
});
