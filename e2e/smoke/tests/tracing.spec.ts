import { expect, test } from './fixtures';

test.describe('Smoke / tracing', () => {
  test('exports an OTel span emitted via faro.api.getOTEL() to /collect', async ({ page, collector }) => {
    // Exercises the TracingInstrumentation + FaroTraceExporter pipeline by
    // emitting a span manually. The harness button only fires if
    // faro.api.getOTEL() returns a TraceAPI — so this also verifies that
    // TracingInstrumentation initialized successfully.

    await page.goto('/');
    await page.locator('[data-cy="btn-emit-span"]').click();

    const span = await collector.waitForMatch((b) =>
      (b.traces?.resourceSpans ?? [])
        .flatMap((rs) => rs.scopeSpans ?? [])
        .flatMap((ss) => ss.spans ?? [])
        .find((s) => s.name === 'smoke-harness-span')
    );

    expect(span.name).toBe('smoke-harness-span');
  });
});
