# API

The Faro API is the primary interface for end-users to interact with Faro. It is the central collector of signals, and
also exposes helper methods for extensions such as metas.

## Signals

### Events

Events are signals that can be used to record user interactions, such as mouse clicks, page navigation, or client-side
application events like page transitions.

Methods:

- `pushEvent` - sends an event

### Exceptions

Exceptions are signals that are represented by errors which occurred in an app.

When an exception is sent, the API will pass it through a stacktrace parser to extract the relevant information from it.
By default, the core package does not contain any stacktrace parsers and they are either provided by wrapper packages
like `web-sdk` or by the user.

Methods:

- `changeStacktraceParser` - replaces the existing stacktrace parser with a new one
- `getStacktraceParser` - returns the current stacktrace parser
- `pushError` - sends an exception

### Logs

Logs are signals which capture events that happen within the app itself. They do not have a business meaning but they
have a use for operators as a means of troubleshooting or observing historic (or current) application behaviour.

Methods:

- `pushLog` - sends a log

### Measurements

Measurements are signals which can be seen as metrics.

Methods:

- `pushMeasurement` - sends a measurement

### Traces

Traces are a special type of signal which are used to track the behaviour of an app. Because Faro does not have an
internal tracing mechanism, we rely on OpenTelemetry library to provide this functionality. However, OpenTelemetry is
quite a heavy system and we do not want to force users to use it. Therefore, the traces API is pretty simple because all
the logic is externalized to other packages like `web-tracing`.

Methods:

- `getOTEL` - returns the OpenTelemetry instance if it is initialized
- `getTraceContext` - returns the OpenTelemetry context API
- `initOTEL` - initializes the OpenTelemetry instance
- `isOTELInitialized` - returns whether the OpenTelemetry instance is initialized
- `pushTraces` - sends traces

## Helpers

### Metas

Metas API leverages the metas SDK to provide a simple interface to interact with metas since the SDK is extremely
barebones.

Methods:

- `getSession` - returns the current session meta value
- `getView` - returns the current view meta value
- `resetSession` - resets the session meta to an undefined state
- `resetUser` - resets the user meta to an undefined state
- `setSession` - replaces the session meta with a new one
- `setUser` - replaces the user meta with a new one
- `setView` - replaces the view meta with a new one
