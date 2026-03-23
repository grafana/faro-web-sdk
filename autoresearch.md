# Autoresearch: Faro Web SDK Bundle Size Optimization

## Goal
Minimize the total bundle size (raw bytes) of the Faro Web SDK packages: core, web-sdk, and web-tracing IIFE bundles.

## Primary Metric
- `total_bytes`: Sum of raw bytes of all three IIFE bundles (core + web-sdk + web-tracing)
- Direction: lower is better

## Secondary Metrics
- `total_gz_bytes`: Gzipped total
- `core_bytes`, `sdk_bytes`, `tracing_bytes`: Individual bundle sizes
- `core_gz_bytes`, `sdk_gz_bytes`, `tracing_gz_bytes`: Individual gzipped sizes

## Benchmark
`bash autoresearch.benchmark.sh` — builds all three bundles from source and reports sizes.

## Checks
`bash autoresearch.checks.sh` — runs jest tests for core, web-sdk, and web-tracing packages.

## Rules
1. **No cheating**: Don't remove features, don't break APIs, don't change test expectations to make tests pass.
2. **No overfitting**: Optimizations must be general code improvements, not benchmark-specific hacks.
3. **Preserve behavior**: All existing public APIs and behaviors must be maintained.
4. **Focus areas**: Code deduplication, dead code removal, more efficient implementations, better tree-shaking, dependency optimization, terser-friendly patterns.
5. **Packages to edit**: `packages/core/src/`, `packages/web-sdk/src/`, `packages/web-tracing/src/`, and build config files.
6. **Don't touch**: Test files, node_modules, external dependencies' source code.

## Architecture
- Monorepo with yarn workspaces + lerna
- Rollup builds IIFE bundles with terser minification
- `@grafana/faro-core` — core SDK (23KB raw)
- `@grafana/faro-web-sdk` — web instrumentations, includes core (92KB raw), depends on `ua-parser-js` and `web-vitals`
- `@grafana/faro-web-tracing` — OpenTelemetry tracing (85KB raw), depends on many `@opentelemetry/*` packages
