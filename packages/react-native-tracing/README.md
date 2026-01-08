# @grafana/faro-react-native-tracing

OpenTelemetry distributed tracing integration for Faro React Native SDK.

## Installation

```bash
npm install @grafana/faro-react-native-tracing
# or
yarn add @grafana/faro-react-native-tracing
```

**Prerequisites:**

- `@grafana/faro-react-native` - Core Faro SDK for React Native
- React Native 0.70 or higher

## Quick Start

```typescript
import { initializeFaro } from '@grafana/faro-react-native';
import { TracingInstrumentation } from '@grafana/faro-react-native-tracing';

const faro = initializeFaro({
  url: 'https://faro-collector-prod-YOUR-REGION.grafana.net/collect/YOUR_TOKEN_HERE',
  app: {
    name: 'my-react-native-app',
    version: '1.0.0',
    environment: 'production',
  },
  instrumentations: [
    // Add tracing instrumentation to enable distributed tracing
    new TracingInstrumentation({
      // Optional: Propagate trace headers to these URLs for distributed tracing
      instrumentationOptions: {
        propagateTraceHeaderCorsUrls: [/https:\/\/my-api\.com/],
      },
    }),
  ],
});
```

That's it! HTTP requests via `fetch()` are now automatically traced and sent to your Faro collector.

## Features

### 🚀 **Automatic Tracing**
- **Fetch Instrumentation**: HTTP requests are automatically traced with no code changes
- **Session Correlation**: Traces are correlated with Faro sessions for complete user journey tracking
- **User Context**: User information is automatically added to span attributes
- **Device Metadata**: Device and platform information included in traces (device model, OS, locale, etc.)

### 🔗 **Distributed Tracing**
- **W3C Trace Context**: Standards-compliant trace propagation via HTTP headers
- **Context Propagation**: Seamlessly connect frontend traces to backend services
- **Configurable CORS**: Control which APIs receive trace headers

### 🎯 **Manual Span Creation**
- **OTEL API Access**: Full OpenTelemetry API available via `faro.otel`
- **Custom Spans**: Create spans for critical business operations
- **Nested Spans**: Build complex trace hierarchies with parent-child relationships
- **Span Attributes**: Add custom metadata to spans for rich context
- **Span Events**: Add timestamped checkpoints within spans

### 🔍 **Faro Integration**
- **User Action Correlation**: Spans are correlated with Faro user actions
- **Log Correlation**: Connect traces with logs using trace/span IDs
- **Error Correlation**: Errors are automatically linked to active spans
- **Measurement Correlation**: Performance metrics tied to traces

### 🛡️ **Infinite Loop Prevention**
The tracing instrumentation is carefully designed to prevent infinite loops that can occur when tracing causes logging, which causes more tracing:

- **Automatic URL Filtering**: Collector URLs are automatically excluded from tracing
- **Trailing Slash Handling**: Handles URL variations (with/without trailing slashes)
- **Internal Logging**: Uses `internalLogger` instead of `console.log` internally
- **Batch Processing**: BatchSpanProcessor delays span export to avoid blocking
- **No Logging During Export**: Zero console output during trace export

## Configuration Options

### Basic Configuration

```typescript
new TracingInstrumentation({
  // Optional: Add custom resource attributes
  resourceAttributes: {
    'service.namespace': 'mobile-apps',
    'deployment.environment': 'staging',
    'custom.attribute': 'value',
  },

  // Optional: Configure trace header propagation
  instrumentationOptions: {
    // URLs that should receive trace context headers
    propagateTraceHeaderCorsUrls: [
      /https:\/\/api\.example\.com/,
      'https://other-api.com',
    ],

    // Optional: Customize fetch instrumentation
    fetchInstrumentationOptions: {
      // Ignore network performance events (default: true)
      ignoreNetworkEvents: true,

      // Optional: Add custom attributes to spans
      applyCustomAttributesOnSpan: (span, request, response) => {
        span.setAttribute('http.custom', 'value');
        span.setAttribute('http.request_id', request.headers['x-request-id']);
      },
    },
  },
});
```

### Advanced Configuration

```typescript
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { FaroTraceExporter, FaroMetaAttributesSpanProcessor } from '@grafana/faro-react-native-tracing';

new TracingInstrumentation({
  // Optional: Custom span processor (advanced)
  spanProcessor: new FaroMetaAttributesSpanProcessor(
    new BatchSpanProcessor(
      new FaroTraceExporter({ api: faro.api }),
      {
        scheduledDelayMillis: 1000,
        maxExportBatchSize: 30,
        maxQueueSize: 100,
      }
    ),
    faro.metas
  ),

  // Optional: Custom OTEL instrumentations (advanced)
  instrumentations: [
    // Your custom OpenTelemetry instrumentations
  ],
});
```

## Usage Examples

### Automatic HTTP Tracing

HTTP requests are automatically traced with no code changes:

```typescript
// This fetch call is automatically traced
const response = await fetch('https://api.example.com/users');
const data = await response.json();

// The span includes:
// - HTTP method, URL, status code
// - Request/response headers (if configured)
// - Duration
// - Session ID, user info
// - Device metadata
```

**Trace includes:**
- `http.method`: `GET`
- `http.url`: `https://api.example.com/users`
- `http.status_code`: `200`
- `session.id`: `abc123`
- `device.model`: `iPhone 15 Pro`
- `device.platform`: `iOS`
- Plus all Faro metas (user, device, session, etc.)

### Manual Span Creation

Create custom spans for business operations:

```typescript
import { faro } from '@grafana/faro-react-native';

async function processOrder(orderId: string) {
  // Access OpenTelemetry API via faro.otel
  const { trace } = faro.otel;
  const tracer = trace.getTracer('my-app');

  // Create a span
  const span = tracer.startSpan('process-order', {
    attributes: {
      'order.id': orderId,
      'operation.type': 'payment',
    },
  });

  try {
    // Your business logic here
    const payment = await processPayment(orderId);

    // Add attributes as you go
    span.setAttribute('payment.amount', payment.amount);
    span.setAttribute('payment.currency', payment.currency);

    // Add an event (checkpoint)
    span.addEvent('payment_validated', {
      'validator.id': payment.validatorId,
    });

    // Mark span as successful
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    // Mark span as error
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
    throw error;
  } finally {
    // Always end the span
    span.end();
  }
}
```

### Nested Spans (Parent-Child Relationships)

Build complex trace hierarchies:

```typescript
import { faro } from '@grafana/faro-react-native';
import { SpanStatusCode } from '@opentelemetry/api';

async function checkoutFlow(cartId: string) {
  const { trace, context } = faro.otel;
  const tracer = trace.getTracer('my-app');

  // Create parent span
  const parentSpan = tracer.startSpan('checkout-flow', {
    attributes: { 'cart.id': cartId },
  });

  try {
    // Use context.with() to make this span the active parent
    await context.with(trace.setSpan(context.active(), parentSpan), async () => {

      // Child span 1: Validate cart
      const validateSpan = tracer.startSpan('validate-cart');
      await validateCart(cartId);
      validateSpan.setStatus({ code: SpanStatusCode.OK });
      validateSpan.end();

      // Child span 2: Process payment
      const paymentSpan = tracer.startSpan('process-payment');
      await processPayment(cartId);
      paymentSpan.setStatus({ code: SpanStatusCode.OK });
      paymentSpan.end();

      // Child span 3: Send confirmation
      const confirmSpan = tracer.startSpan('send-confirmation');
      await sendConfirmation(cartId);
      confirmSpan.setStatus({ code: SpanStatusCode.OK });
      confirmSpan.end();
    });

    parentSpan.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    parentSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    parentSpan.recordException(error);
  } finally {
    parentSpan.end();
  }
}
```

### Correlation with Faro User Actions

Spans are automatically correlated with user actions:

```typescript
import { faro } from '@grafana/faro-react-native';
import { withFaroUserAction } from '@grafana/faro-react-native';
import { TouchableOpacity } from 'react-native';

// Create a tracked button
const TrackedButton = withFaroUserAction(TouchableOpacity, 'load-data');

function DataLoader() {
  const handleLoad = async () => {
    // This fetch will be traced AND correlated with the user action
    // The span will include: faro.action.user.name = "load-data"
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
  };

  return (
    <TrackedButton onPress={handleLoad}>
      <Text>Load Data</Text>
    </TrackedButton>
  );
}
```

### Correlation with Faro Logs

Connect traces with logs for full observability:

```typescript
import { faro } from '@grafana/faro-react-native';
import { SpanStatusCode } from '@opentelemetry/api';

function performOperation() {
  const { trace, context } = faro.otel;
  const tracer = trace.getTracer('my-app');
  const span = tracer.startSpan('important-operation');

  // Run operation within span context
  context.with(trace.setSpan(context.active(), span), () => {
    // This log will be correlated with the span
    // via trace_id and span_id in the log meta
    faro.api.pushLog(['Operation started'], {
      context: 'operations',
      level: 'info',
    });

    // Do work...

    faro.api.pushLog(['Operation completed successfully'], {
      context: 'operations',
      level: 'info',
    });

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  });
}
```

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your React Native App                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ fetch() calls
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              FetchInstrumentation (OTEL)                     │
│  • Intercepts fetch() calls                                  │
│  • Creates spans automatically                               │
│  • Propagates W3C Trace Context headers                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Spans
                       ↓
┌─────────────────────────────────────────────────────────────┐
│           FaroMetaAttributesSpanProcessor                    │
│  • Adds Faro metas (session, user, device)                   │
│  • Enriches spans with context                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Enriched spans
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              BatchSpanProcessor (OTEL)                       │
│  • Batches spans (max 30, delay 1000ms)                     │
│  • Reduces network requests                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Span batches
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                 FaroTraceExporter                            │
│  • Converts spans to OTLP format                             │
│  • Sends to Faro collector via pushTraces()                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ OTLP/HTTP
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              Grafana Cloud / Faro Collector                  │
│  • Receives traces                                           │
│  • Stores in Tempo                                           │
│  • Links traces ↔ logs ↔ metrics                             │
└─────────────────────────────────────────────────────────────┘
```

### Span Lifecycle

1. **Span Creation**: When a fetch() call is made, FetchInstrumentation creates a span
2. **Context Propagation**: W3C Trace Context headers added to request (if URL matches `propagateTraceHeaderCorsUrls`)
3. **Enrichment**: FaroMetaAttributesSpanProcessor adds Faro metas (session, user, device)
4. **Batching**: BatchSpanProcessor collects spans (30 spans or 1000ms delay)
5. **Export**: FaroTraceExporter converts spans to OTLP format
6. **Transmission**: Spans sent to Faro collector via `faro.api.pushTraces()`

### Span Attributes

Every span includes these attributes:

**Standard OTEL Attributes:**
- `http.method` - HTTP method (GET, POST, etc.)
- `http.url` - Full URL
- `http.status_code` - HTTP status code
- `http.target` - URL path

**Faro Session Attributes:**
- `session.id` - Faro session ID
- `session.attributes.*` - Custom session attributes

**User Attributes (if set):**
- `enduser.id` - User ID
- `enduser.username` - Username
- `enduser.email` - Email

**Device Attributes:**
- `device.model` - Device model (e.g., "iPhone 15 Pro")
- `device.brand` - Device manufacturer (e.g., "Apple")
- `device.platform` - OS name (e.g., "iOS")
- `device.os_version` - OS version (e.g., "17.0")
- `device.locale` - Device locale (e.g., "en-US")

**App Attributes:**
- `service.name` - App name from config
- `service.version` - App version
- `service.namespace` - App namespace (if set)
- `deployment.environment.name` - Environment (production, staging, etc.)

**User Action Attributes (if active):**
- `faro.action.user.name` - Name of user action
- `faro.action.user.parentId` - Parent action ID

## Distributed Tracing

### Connecting Frontend to Backend

To enable full distributed tracing, configure your backend to accept W3C Trace Context headers:

```typescript
// Frontend (React Native)
new TracingInstrumentation({
  instrumentationOptions: {
    // Propagate headers to your API
    propagateTraceHeaderCorsUrls: [/https:\/\/api\.example\.com/],
  },
});

// Backend (Node.js + Express + OpenTelemetry)
const { W3CTraceContextPropagator } = require('@opentelemetry/core');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');

const provider = new NodeTracerProvider();
provider.register({
  propagator: new W3CTraceContextPropagator(),
});
```

When configured correctly:
1. Frontend creates a span for the HTTP request
2. Frontend adds `traceparent` and `tracestate` headers to the request
3. Backend extracts trace context from headers
4. Backend creates child spans linked to frontend trace
5. Both frontend and backend spans appear in the same trace in Grafana

### Example Distributed Trace

```
Trace: abc123-def456-ghi789

├─ [Frontend] fetch POST /api/orders (250ms)
│  ├─ [Backend] POST /api/orders (200ms)
│  │  ├─ [Backend] validate-order (10ms)
│  │  ├─ [Backend] query-database (150ms)
│  │  └─ [Backend] send-email (40ms)
│  └─ [Frontend] parse-response (5ms)
```

## Troubleshooting

### No traces appearing in Grafana Cloud

**Check session sampling:**
```typescript
const session = faro.api.getSession();
console.log('Session:', session);
console.log('Is sampled:', session?.attributes?.isSampled);
```

If `isSampled` is false, traces won't be collected. Adjust `samplingRate` in session config:

```typescript
initializeFaro({
  // ...
  sessionTracking: {
    samplingRate: 1.0, // 100% of sessions
  },
});
```

**Verify collector URL:**
```typescript
// Check that URL is correctly formatted
console.log('Collector URL:', faro.config.url);
```

**Check network requests:**
Open React Native debugger → Network tab → Look for POST requests to `/collect/`

### Infinite loops / exponential requests

**Symptoms:**
- App sends exponentially growing requests
- App becomes unresponsive
- Dev tools crash

**Cause:** Trace export requests are being traced, creating an infinite loop.

**Solution:** This should be automatically prevented. If you experience this issue:

1. **Update to latest version** - Infinite loop prevention was fixed in recent versions
2. **Check for custom span processors** - Don't use `console.log` in custom processors
3. **Verify URL filtering** - Collector URLs should be automatically excluded

```typescript
// Debug: Check which URLs are being ignored
const ignoredUrls = transport.getIgnoreUrls();
console.log('Ignored URLs:', ignoredUrls);
```

### OTEL is not available error

**Error:**
```
OTEL is not available. Make sure tracing is initialised
```

**Cause:** Trying to use `faro.otel` before TracingInstrumentation is initialized.

**Solution:**

```typescript
// ✅ Correct: Initialize tracing first
const faro = initializeFaro({
  instrumentations: [
    new TracingInstrumentation(),
  ],
});

// Then use faro.otel
const { trace } = faro.otel;

// ❌ Wrong: Using faro.otel without tracing instrumentation
const faro = initializeFaro({
  instrumentations: [], // No tracing!
});
const { trace } = faro.otel; // Error!
```

### Trace IDs are all zeros (00000000000000000000000000000000)

**Cause:** TracerProvider is not registered as the global provider.

**Solution:** This should be automatic. If you're using a custom span processor or custom instrumentations, ensure you're not overriding the tracer provider registration.

### Spans missing user/session/device context

**Cause:** FaroMetaAttributesSpanProcessor is not wrapping your span processor.

**Solution:** Use the default span processor or ensure you wrap your custom processor:

```typescript
import { FaroMetaAttributesSpanProcessor } from '@grafana/faro-react-native-tracing';

new TracingInstrumentation({
  spanProcessor: new FaroMetaAttributesSpanProcessor(
    yourCustomSpanProcessor,
    faro.metas
  ),
});
```

### Backend spans not appearing in frontend trace

**Cause:** Backend is not configured to accept W3C Trace Context headers, or CORS is blocking headers.

**Solutions:**

1. **Enable W3C propagator on backend:**
```javascript
// Node.js + OpenTelemetry
const { W3CTraceContextPropagator } = require('@opentelemetry/core');
provider.register({
  propagator: new W3CTraceContextPropagator(),
});
```

2. **Configure CORS to allow trace headers:**
```javascript
// Express
app.use(cors({
  allowedHeaders: ['traceparent', 'tracestate'],
}));
```

3. **Add backend URL to propagation list:**
```typescript
new TracingInstrumentation({
  instrumentationOptions: {
    propagateTraceHeaderCorsUrls: [/https:\/\/your-backend\.com/],
  },
});
```

## API Reference

### TracingInstrumentation

Main instrumentation class for distributed tracing.

```typescript
class TracingInstrumentation extends BaseInstrumentation {
  constructor(options?: TracingInstrumentationOptions);
  initialize(): void;
  shutdown(): Promise<void>;
}
```

**Options:**

```typescript
interface TracingInstrumentationOptions {
  // Custom OTEL resource attributes
  resourceAttributes?: Attributes;

  // Custom OTEL propagator (default: W3CTraceContextPropagator)
  propagator?: TextMapPropagator;

  // Custom OTEL context manager (default: ZoneContextManager)
  contextManager?: ContextManager;

  // Custom OTEL instrumentations (replaces default FetchInstrumentation)
  instrumentations?: Instrumentation[];

  // Custom span processor (replaces default BatchSpanProcessor)
  spanProcessor?: SpanProcessor;

  // Instrumentation options
  instrumentationOptions?: {
    // URLs to propagate trace headers to
    propagateTraceHeaderCorsUrls?: Array<string | RegExp>;

    // Fetch instrumentation options
    fetchInstrumentationOptions?: {
      // Custom attributes function
      applyCustomAttributesOnSpan?: FetchCustomAttributeFunction;

      // Ignore network events (default: true)
      ignoreNetworkEvents?: boolean;
    };
  };
}
```

### FaroTraceExporter

Exports OpenTelemetry spans to Faro collector.

```typescript
class FaroTraceExporter implements SpanExporter {
  constructor(config: FaroTraceExporterConfig);
  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void;
  shutdown(): Promise<void>;
}
```

### getDefaultOTELInstrumentations()

Returns default OpenTelemetry instrumentations for React Native.

```typescript
function getDefaultOTELInstrumentations(
  options?: DefaultInstrumentationsOptions
): Instrumentation[];
```

Currently returns:
- `FetchInstrumentation` - Automatic HTTP tracing

### faro.otel

Access OpenTelemetry APIs for manual tracing.

```typescript
interface FaroOTEL {
  trace: TraceAPI;  // OpenTelemetry trace API
  context: ContextAPI;  // OpenTelemetry context API
}

// Usage
const { trace, context } = faro.otel;
const tracer = trace.getTracer('my-app');
const span = tracer.startSpan('operation');
```

## Best Practices

### ✅ DO

- **Use automatic tracing** - Let FetchInstrumentation handle HTTP requests
- **Add meaningful attributes** - Include business context in spans
- **Use span events** - Add checkpoints for important operations
- **Set span status** - Mark spans as OK or ERROR
- **End spans** - Always call `span.end()` in a finally block
- **Use context.with()** - For nested spans
- **Correlate with user actions** - Use `withFaroUserAction` HOC
- **Configure propagation** - Add your APIs to `propagateTraceHeaderCorsUrls`
- **Sample sessions** - Use sampling for high-traffic apps

### ❌ DON'T

- **Don't use console.log in span processors** - Causes infinite loops
- **Don't forget to end spans** - Causes memory leaks
- **Don't create spans for trivial operations** - Keep trace volume reasonable
- **Don't include PII in span attributes** - Respect user privacy
- **Don't trace internal URLs** - Collector URLs are auto-excluded
- **Don't create deeply nested spans** - Keep hierarchy shallow (< 10 levels)

## Examples

See the demo app for complete examples:
- [TracingDemoScreen.tsx](../../demo-react-native/src/screens/TracingDemoScreen.tsx) - 10 comprehensive tracing scenarios
- [initialize.ts](../../demo-react-native/src/faro/initialize.ts) - Faro initialization with tracing

## Performance Considerations

### Overhead

- **Automatic tracing**: ~5-10ms per HTTP request
- **Manual spans**: ~0.5-1ms per span
- **Batch processing**: Minimal impact (1000ms delay)

### Optimization Tips

1. **Sample sessions** - Don't trace every session:
```typescript
sessionTracking: {
  samplingRate: 0.1, // 10% of sessions
}
```

2. **Increase batch size** - Reduce network requests:
```typescript
new BatchSpanProcessor(exporter, {
  maxExportBatchSize: 50, // Default: 30
  scheduledDelayMillis: 2000, // Default: 1000
})
```

3. **Filter spans** - Don't trace everything:
```typescript
fetchInstrumentationOptions: {
  applyCustomAttributesOnSpan: (span, request) => {
    // Skip internal requests
    if (request.url.includes('/health')) {
      span.setAttribute('skip', true);
    }
  },
}
```

## TypeScript

The package is written in TypeScript and includes type definitions.

```typescript
import type {
  TracingInstrumentationOptions,
  FaroTraceExporterConfig,
  DefaultInstrumentationsOptions,
} from '@grafana/faro-react-native-tracing';
```

## License

Apache-2.0

## Contributing

See the main repository [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## Support

- 📖 [Documentation](https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/)
- 💬 [GitHub Discussions](https://github.com/grafana/faro-web-sdk/discussions)
- 🐛 [Issue Tracker](https://github.com/grafana/faro-web-sdk/issues)
