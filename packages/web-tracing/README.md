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

As a result, all spans are emitted by, and shaped by the configuration of, the owning instance. Later
instances can still create manual spans against the shared provider via `faro.api.getOTEL()`, but do
not emit their own automatic HTTP spans. This applies regardless of the `isolate` config option, since
tracer-provider registration and fetch/XHR patching are inherently global.

[faro-web-sdk-package]: https://github.com/grafana/faro-web-sdk/tree/main/packages/web-sdk
[opentelemetry-js]: https://opentelemetry.io/docs/instrumentation/js/
[quick-start]: https://github.com/grafana/faro-web-sdk/blob/main/docs/sources/tutorials/quick-start-browser.md
