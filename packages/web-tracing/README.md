# @grafana/faro-web-tracing

This package provides tools for integrating [OpenTelemetry][opentelemetry-js] based tracing with the
[Faro for the web][faro-web-sdk-package].

See [quick start document][quick-start] for instructions how to set up and use.

## Multiple Faro instances on one page (micro-frontends)

Tracing is legacy-compatible by default. The first tracing-enabled instance selects the page mode;
omitting `mode` selects `legacy`, while `mode: 'routing'` opts the page into shared network routing.
The mode is fixed for the page lifetime, and later instances inherit it. An external OpenTelemetry
provider causes Faro to yield without patching fetch/XHR.

Routing mode lets each app retain its own provider, resource (`service.name`), processors, exporter,
transport, credentials, and callbacks while one page-owned fetch/XHR capture wrapper resolves every
request. Configure it on each routing-enabled instance:

```ts
new TracingInstrumentation({
  mode: 'routing',
  apiUrlMatchers: [{ pattern: 'https://api.example.test/orders', target: 'full-url' }],
  pageRouteMatchers: [{ pattern: '/orders', target: 'pathname' }],
  drainTimeoutMs: 30_000,
});
```

Matchers are exact strings or regular expressions and explicitly target the full URL (including
query/hash) or pathname. A unique API claimant wins; otherwise a unique current page-route claimant
wins across all active apps; ambiguous or unresolved requests use the active global/non-isolated app,
or the earliest active isolated app. Ownership is fixed at fetch/span creation or XHR `open()` and
is not reassigned by navigation or later registration.

Call `destroy()` when an app unmounts. New requests stop selecting it, while already-started spans
finish through its original pipeline until the single bounded drain deadline (default 30 seconds,
maximum 5 minutes; `0` expires immediately). When no active app remains, capture stays patched but is
dormant and is re-enabled for a later registration. Collector exclusions remain page-wide during
drain; app-specific exclusions and pause suppress the span, Faro HTTP event, and Faro headers without
rerouting. Phase 1 does not infer ownership from JavaScript stacks. To roll back routing, select
`mode: 'legacy'` on the next page load; the live global provider is not replaced in place.

[faro-web-sdk-package]: https://github.com/grafana/faro-web-sdk/tree/main/packages/web-sdk
[opentelemetry-js]: https://opentelemetry.io/docs/instrumentation/js/
[quick-start]: https://github.com/grafana/faro-web-sdk/blob/main/docs/sources/tutorials/quick-start-browser.md
