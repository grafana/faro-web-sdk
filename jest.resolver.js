// Jest 30 adds the `node` condition for CommonJS even under jsdom, so OpenTelemetry 3.x `#platform` imports would
// load their Node builds. Drop `node` when the environment asks for `browser`.
// https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/3.x/migration-guide.md#bundler-requirements-for-packages-with-platform-specific-code
module.exports = (request, options) =>
  options.defaultResolver(request, {
    ...options,
    conditions: options.conditions?.includes('browser')
      ? options.conditions.filter((c) => c !== 'node')
      : options.conditions,
  });
