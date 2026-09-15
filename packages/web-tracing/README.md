# @grafana/faro-web-tracing

This package provides tools for integrating [OpenTelemetry][opentelemetry-js] based tracing with the
[Faro for the web][faro-web-sdk-package].

See [quick start document][quick-start] for instructions how to set up and use.

## Session ownership

The default span processor retains the metadata attached at span start. The Faro exporter groups
spans by that metadata, so a batch can contain spans from multiple sessions without assigning
them to the current session. Client-span Faro events retain the same ownership. A sampled span
is still delivered if a later session is unsampled.
Spans started by a session generator or sampler during session preparation are discarded at
span start, even if their batch would otherwise export after preparation finishes.

When supplying a custom span processor with `FaroTraceExporter`, wrap it in
`FaroMetaAttributesSpanProcessor` to retain this behavior. Spans submitted directly to the exporter
without that processor retain the existing export-time metadata behavior.

For other delayed signals, `api.pushTraces(payload, { meta })` and
`api.pushEvent(name, attributes, domain, { meta })` accept previously captured metadata, such as
the result of `captureMetas(faro.metas)`. Normal capture admission and filtering still apply.

[faro-web-sdk-package]: https://github.com/grafana/faro-web-sdk/tree/main/packages/web-sdk
[opentelemetry-js]: https://opentelemetry.io/docs/instrumentation/js/
[quick-start]: https://github.com/grafana/faro-web-sdk/blob/main/docs/sources/tutorials/quick-start-browser.md
