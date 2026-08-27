# @grafana/faro-web-tracing

This package provides tools for integrating [OpenTelemetry][opentelemetry-js] based tracing with the
[Faro for the web][faro-web-sdk-package].

See [quick start document][quick-start] for instructions how to set up and use.

## Multiple Faro instances on one page (micro-frontends)

OpenTelemetry allows only a single global tracer provider, propagator and context manager per
browsing context, and the fetch/XHR instrumentations patch the global `fetch`/`XMLHttpRequest` only
once. Because of this, when several Faro instances run on the same page (for example in a
micro-frontend architecture), **only the first instance to initialize tracing owns it**: it registers
the tracer provider and instruments fetch/XHR. Any Faro instance that adds a `TracingInstrumentation`
afterwards detects the existing owner, logs a warning, and does not register a second provider or
re-patch fetch/XHR (this also avoids OpenTelemetry "duplicate registration" errors).

As a result, **all spans are exported by the owning instance** — using its exporter, its resource
(`service.name`), and its collector — no matter which instance created them, and only the owner
produces automatic fetch/XHR spans. Later instances register no exporter of their own, so they never
export spans directly; they can still create spans against the shared provider via
`faro.api.getOTEL()` (for example, manual spans), but those spans are exported by the owning instance
and attributed to it. This applies regardless of the `isolate` config option, since tracer-provider
registration and fetch/XHR patching are inherently global.

Cross-origin trace-header propagation is preserved across instances: every instance's
`propagateTraceHeaderCorsUrls` is merged into the owner, so the owning instance still injects W3C
trace headers for URLs configured by any instance. Per-instance custom span attributes
(`applyCustomAttributesOnSpan`) are not merged — only the owner's are applied.

[faro-web-sdk-package]: https://github.com/grafana/faro-web-sdk/tree/main/packages/web-sdk
[opentelemetry-js]: https://opentelemetry.io/docs/instrumentation/js/
[quick-start]: https://github.com/grafana/faro-web-sdk/blob/main/docs/sources/tutorials/quick-start-browser.md
