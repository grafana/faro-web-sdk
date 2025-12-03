# @grafana/faro-react-native-tracing

OpenTelemetry tracing integration for Faro React Native SDK.

## Installation

```bash
npm install @grafana/faro-react-native-tracing
# or
yarn add @grafana/faro-react-native-tracing
```

## Usage

```typescript
import { initializeFaro } from '@grafana/faro-react-native';
import { TracingInstrumentation } from '@grafana/faro-react-native-tracing';

initializeFaro({
  url: 'https://your-collector-url',
  app: {
    name: 'my-react-native-app',
    version: '1.0.0',
  },
  instrumentations: [
    new TracingInstrumentation({
      // Optional: propagate trace headers to these URLs
      propagateTraceHeaderCorsUrls: [/https:\/\/my-api\.com/],
    }),
  ],
});
```

## Features

- **Automatic Fetch Tracing**: HTTP requests via `fetch()` are automatically traced
- **Session Correlation**: Traces are correlated with Faro sessions
- **User Context**: User information is automatically added to spans
- **Device Metadata**: Device and platform information included in traces
- **Infinite Loop Prevention**: Carefully designed to avoid logging loops

## How It Works

The tracing instrumentation:

1. Creates OpenTelemetry spans for HTTP requests
2. Correlates spans with Faro sessions and user actions
3. Exports traces to your Faro collector
4. Sends CLIENT spans as Faro events for correlation

## Important Notes

### Avoiding Infinite Loops

This package is designed to prevent infinite loops that can occur when tracing causes logging, which causes more tracing. Key preventions:

- Uses `internalLogger` instead of `console.log`
- Collector URLs are automatically added to `ignoreUrls`
- No logging during trace export
- Batch processing delays span export

### Debugging Tracing

If you need to debug tracing issues, check:

1. **Session Sampling**: Traces are only collected if the session is sampled
2. **Ignored URLs**: Collector URLs and any URLs in your config are not traced
3. **Network Tab**: Check that trace payloads are being sent

## Configuration Options

```typescript
new TracingInstrumentation({
  // Add custom resource attributes
  resourceAttributes: {
    'custom.attribute': 'value',
  },

  // Configure which URLs to propagate trace headers to
  propagateTraceHeaderCorsUrls: [/https:\/\/api\.example\.com/, 'https://other-api.com'],

  // Customize fetch instrumentation
  fetchInstrumentationOptions: {
    ignoreNetworkEvents: true,
    applyCustomAttributesOnSpan: (span, request, response) => {
      // Add custom attributes to spans
      span.setAttribute('custom.attr', 'value');
    },
  },
});
```

## API Reference

### TracingInstrumentation

Main instrumentation class for distributed tracing.

**Options:**

- `resourceAttributes`: Custom OTEL resource attributes
- `propagateTraceHeaderCorsUrls`: URLs to propagate trace headers to
- `fetchInstrumentationOptions`: Fetch instrumentation configuration
- `spanProcessor`: Custom span processor (advanced)
- `instrumentations`: Custom OTEL instrumentations (advanced)

### FaroTraceExporter

Exports OpenTelemetry spans to Faro collector.

### getDefaultOTELInstrumentations()

Returns default OTEL instrumentations for React Native (FetchInstrumentation).

## Example: Custom Spans

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-app');

function myFunction() {
  const span = tracer.startSpan('my-operation');

  try {
    // Your code here
    span.setAttribute('custom.attr', 'value');
  } finally {
    span.end();
  }
}
```

## Troubleshooting

### No traces appearing

1. Check session is sampled: `faro.api.getSession()`
2. Verify collector URL is correct
3. Check network tab for trace payloads

### Infinite loops

If you experience infinite loops:

1. Ensure you're using the latest version
2. Check that collector URLs are not being traced
3. Avoid using `console.log` in custom span processors

## License

Apache-2.0

## Contributing

See main repository [CONTRIBUTING.md](../../CONTRIBUTING.md)
