# Autoresearch Ideas: Bundle Size Optimization

## Explored and completed
- Replace ua-parser-js with lightweight parseUserAgent (~18KB saved)
- Optimize spread operators → mutation patterns in core utilities
- Terser configuration with aggressive options (passes:3, ecma:2020, toplevel:true)

## Potential future optimizations
- **web-vitals/attribution → web-vitals (non-attribution)**: Would save ~5-8KB minified in sdk bundle, but removes attribution data. Could be a config option or separate entry point.
- **Lazy-load web-vitals**: Use dynamic import() to load web-vitals only when needed. Would reduce initial bundle size but add async complexity.
- **Reduce Observable complexity**: The Observable class has first(), takeWhile(), filter(), merge() with complex unsubscribe override patterns. Could be simplified if some methods are rarely used.
- **DONE: Moved otlp-transformer imports to ESM** — saved ~5.5KB in web-tracing bundle
- **Check other OTel package imports for CJS→ESM opportunities**: @opentelemetry/core, @opentelemetry/instrumentation, @opentelemetry/sdk-trace-web etc. may also have ESM paths that could improve tree-shaking.
- **Property mangling**: Terser property mangling could save significant bytes but is risky (breaks external API contracts). Would need careful allowlisting.
- **Module-level constant inlining by rollup**: Some constants like VERSION, event names, etc. could be inlined by rollup's `define` or terser's `global_defs`.
- **Session manager refactoring**: PersistentSessionsManager and VolatileSessionsManager have similar code that could be unified.
- **Replace class inheritance with composition**: BaseExtension/BaseInstrumentation/BaseTransport use inheritance which generates more code than composition patterns.
