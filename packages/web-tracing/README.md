# @grafana/faro-web-tracing

This package provides tools for integrating [OpenTelemetry][opentelemetry-js] based tracing with the
[Faro for the web][faro-web-sdk-package].

See [quick start document][quick-start] for instructions how to set up and use.

## Multiple Faro instances on one page (micro-frontends)

Tracing is legacy-compatible by default. The first tracing-enabled instance selects the page mode;
omitting `mode` selects `legacy`, while `mode: 'routing'` opts the page into shared network routing.
The mode is fixed for the page lifetime, and later instances inherit it. In routing mode, Faro yields
without installing its router when an external global OpenTelemetry provider is already registered;
legacy mode retains its existing behavior and instruments fetch/XHR against the global provider.

### Legacy mode (default)

The first tracing-enabled Faro instance owns the page-global provider and the single fetch/XHR
instrumentation. Its exporter, resource attributes, processors, and network-span callbacks apply to
captured spans; later instances do not receive independent spans, even when initialized with
`isolate: true`. Later instances' `propagateTraceHeaderCorsUrls` entries are merged into the owner's
live allowlist. Use routing mode when each app needs its own exporter and span pipeline.

### Routing mode

Routing mode interoperates with bundles that use the legacy `_faroTracingOwner` contract. If a
legacy Faro bundle already owns tracing before routing capture starts, routing falls back to legacy
non-owner behavior. Once routing capture is installed, it claims that owner key so later legacy
bundles do not install a second fetch/XHR wrapper.

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

Manual spans created through the page-global `faro.api.getOTEL()` continue to use the fallback app
because that API does not identify which micro-frontend called it. For page-route attribution, retain
a `TracingInstrumentation` instance and use its `getTracer()` method after Faro is initialized:

```ts
const tracing = new TracingInstrumentation({
  mode: 'routing',
  pageRouteMatchers: [{ pattern: '/checkout', target: 'pathname' }],
});
initializeFaro({ instrumentations: [tracing] });

const tracer = tracing.getTracer('checkout');
const span = tracer.startSpan('checkout');
// ...work...
span.end();
```

In routing mode, `getTracer()` returns a shared page router. Ownership is resolved against the current
page route at each `startSpan()` call, so a cached tracer follows client-side navigation. A unique
page-route match owns the span; otherwise the active fallback is used. Parent context is preserved.

Call `destroy()` when an app unmounts. New requests stop selecting it, while already-started spans
finish through its original pipeline until the single bounded drain deadline (default 30 seconds,
maximum 5 minutes; `0` expires immediately). When no active app remains, capture stays patched but is
dormant and is re-enabled for a later registration. Only registrations in the shared routing registry
participate in fallback selection. A legacy non-owner can use the shared router while a routing
registration is active, but once the final registration drains there is no routing destination and its
spans are no longer exported. Keep a routing-aware Faro instance registered if legacy co-tenants need
continued tracing. Collector URLs reported by registered Faro transports are suppressed centrally,
including spans created by other instrumentation using the shared provider; custom collector URLs from
legacy bundles that do not join the registry cannot be discovered. Collector exclusions remain
page-wide during drain; app-specific exclusions and pause suppress the span, Faro HTTP event, and Faro
headers without rerouting. Phase 1 does not infer ownership from JavaScript stacks. To roll back routing,
select `mode: 'legacy'` on the next page load; the live global provider is not replaced in place.

[faro-web-sdk-package]: https://github.com/grafana/faro-web-sdk/tree/main/packages/web-sdk
[opentelemetry-js]: https://opentelemetry.io/docs/instrumentation/js/
[quick-start]: https://github.com/grafana/faro-web-sdk/blob/main/docs/sources/tutorials/quick-start-browser.md
