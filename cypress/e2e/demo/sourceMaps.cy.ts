import { ExceptionEvent } from '@grafana/faro-core';

context('Source maps', () => {
  it('serves a `.map` alongside the bundle chunk that Faro reports as the error origin', () => {
    let capturedFilename: string | undefined;

    // `buildStackFrame` falls back to `document.location.href` when it cannot
    // extract a filename, so we cannot rely on `frames[0].filename` — pick the
    // first frame whose filename actually points at a JS chunk.
    cy.interceptCollector((body) => {
      const exception = body.exceptions?.find(
        (item: ExceptionEvent) => item.type === 'Error' && item.value === 'This is a thrown error'
      );

      const chunkFilename = exception?.stacktrace?.frames
        .map((frame) => frame.filename)
        .find((filename): filename is string => typeof filename === 'string' && /\.js(\?|$)/.test(filename));

      if (chunkFilename) {
        capturedFilename = chunkFilename;
      }

      return undefined;
    });

    cy.on('uncaught:exception', () => false);

    cy.visit('/features');
    cy.clickButton('btn-throw-error');

    // Retry until the interceptor has seen an exception whose stack points at a
    // built chunk. The first POST `/collect` may carry unrelated telemetry, so
    // a plain `cy.wait` on the interceptor alias would race the predicate.
    cy.wrap(null).should(() => {
      expect(capturedFilename, 'a Faro-reported stack frame should point at a JS chunk').to.be.a('string');
    });

    // The captured frame points at a built JS chunk. Its matching `.map` must be
    // served by the demo so Alloy's faro.receiver can symbolicate stack frames
    // back to the original TypeScript source. Without `build.sourcemap: true` in
    // `demo/vite.config.ts`, the `.map` would 404 and symbolication would silently
    // fail — see grafana/faro-web-sdk#2043.
    cy.then(() => {
      const sourceUrl = capturedFilename!.replace(/\?.*$/, '');
      const mapUrl = `${sourceUrl}.map`;

      cy.request(sourceUrl).its('status').should('eq', 200);
      cy.request(mapUrl).then((res) => {
        expect(res.status, `expected ${mapUrl} to be served`).to.eq(200);
        expect(res.headers['content-type']).to.match(/json/);
      });
    });
  });
});
