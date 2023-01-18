# Transports

Transports are the final data processors in the Faro architecture. They are responsible for doing something with the
data once it was collected by the instrumentations and processed by the internal API.

By default, the core library does not provide any transports out of the box and they are either prvovided by wrapper
packages like `web-sdk` or by the user.

## Transports SDK

The transports SDK is the internal handler for the transports component. It is responsible for keeping track of the
initialized transports as well as adding others, removing existing ones, pausing them etc.

Methods and properties:

- `add()` - adds a new transport
- `addBeforeSendHook()` - adds a hook that is called before a signal is sent to each transport
- `addIgnoreErrorsPatterns()` - adds a pattern that matches errors which should be ignored
- `getBeforeSendHooks()` - return the list of hooks that are called before a signal is sent to each transport
- `execute()` - sends a signal to each registered transport
- `isPaused()` - returns whether the transports are paused or not
- `pause()` - pauses the transports
- `remove()` - remove a specific transport
- `removeBeforeSendHooks()` - removes a specific hook
- `transports` - the current list of registered transports
- `unpause()` - unpauses the transports
