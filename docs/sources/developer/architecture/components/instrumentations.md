# Instrumentations

Instrumentations are the data collectors in the Faro architecture. They are responsible for gathering the data from
various APIs like the browesr APIs or by other means.

The core library does not provide any instrumentations out of the box and they are either provided by wrapper packages
like `web-sdk` or by the user.

## Instrumentations SDK

The instrumentations SDK is the internal handler for the instrumentations component. It is responsible for keeping track
of the initialized instrumentations as well as adding others and removing existing ones.

Methods and properties:

- `add()` - adds a new instrumentation
- `remove()` - removes a specific instrumentation
- `instrumentations` - accesses the current list of initialized instrumentations
