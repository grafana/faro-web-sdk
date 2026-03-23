# Autoresearch Ideas: Bundle Size Optimization

## Explored and completed
- Replace ua-parser-js with lightweight parseUserAgent (~18.7KB saved in SDK)
- Optimize spread operators → mutation patterns in core utilities (-214B)
- Optimize deepEqual + exception init (-64B)
- Optimize FetchTransport spreads (-27B)
- Terser configuration: passes:4, ecma:2020, toplevel:true, unsafe:true, module:true (~1.5KB total)
- ES2020 TypeScript target for bundle compilation (~7.8KB total - biggest win after ua-parser)
- Deduplicate PersistentSessionsManager/VolatileSessionsManager (-703B)
- Replace string enums with const objects + type aliases (-1.5KB)
- Switch OTel otlp-transformer imports from CJS to ESM paths (-5.5KB in tracing)
- Inline ESpanKind constant to avoid enum IIFE import
- Simplify Observable class: shared _pipe() method, simplified merge() (-454B)

## Potential future optimizations
- **web-vitals/attribution → web-vitals (non-attribution)**: Would save ~5-8KB minified in sdk bundle, but removes attribution data. Could be a config option or separate entry point.
- **Lazy-load web-vitals**: Use dynamic import() to load web-vitals only when needed. Would reduce initial bundle size but add async complexity.
- **Reduce Observable complexity**: The Observable class has first(), takeWhile(), filter(), merge() with complex unsubscribe override patterns. Could be simplified if some methods are rarely used.
- **DONE: Moved otlp-transformer imports to ESM** — saved ~5.5KB in web-tracing bundle
- **Check other OTel package imports for CJS→ESM opportunities**: @opentelemetry/core, @opentelemetry/instrumentation, @opentelemetry/sdk-trace-web etc. may also have ESM paths that could improve tree-shaking.
- **Property mangling**: Terser property mangling could save significant bytes but is risky (breaks external API contracts). Would need careful allowlisting.
- **Module-level constant inlining by rollup**: Some constants like VERSION, event names, etc. could be inlined by rollup's `define` or terser's `global_defs`.
- **DONE: Session manager refactoring** — deduplicated via factory function (-703B)
- **Replace class inheritance with composition**: BaseExtension/BaseInstrumentation/BaseTransport use inheritance which generates more code than composition patterns.
- **Shared instrumentation name prefix**: 11 strings share "@grafana/faro-web-sdk:" prefix (~330 chars saveable by extracting prefix variable).
- **Convert UserActionState numeric enum to const object**: Would save ~100B but tests need type fixes (tests declare `let state = UserActionState.Started` which infers literal type `0`).
- **Try SWC or esbuild minifier**: Could potentially produce smaller output than terser for some code patterns.
- **Check other OTel imports for CJS→ESM**: @opentelemetry/core, @opentelemetry/instrumentation etc. are resolved via `module` field already, but deep subpath imports should always use ESM.
