# Internal SDK coordination

`@grafana/faro-core/internal` is reserved for coordination between Faro SDK packages.
It is not a supported application or extension API and may change without notice.

Session update listeners and capture filters live in a WeakMap keyed by each SDK's
`Metas` instance. They are absent from the public `Metas` type, the `faro.metas`
object, and the package's root exports. Keeping the state here lets core and the
web SDK share it without adding lifecycle controls to the public metadata API.

The entry point resolves to the same internal module used by core in both the
CommonJS and ES module builds. Keep these resolutions aligned so capture filters
and session updates use the same registry.
