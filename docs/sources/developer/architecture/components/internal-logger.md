# Internal Logger

The internal logger is a helper utility that is used to log messages from the library itself. Due to the fact that it
relies on the unpatched console, the messages printed by the internal logger are not captured during
auto-instrumentation of the `console` object.

The internal logger is initialized imediately after the unpatched console is initialized. Similar to the unpatched
console, it is also made available to all components that are initialized after it.

Methods available within the internal logger:

- `debug` - used to log verbose messages that are usually necessary during development
- `info` - used to log messages that are useful for the end-user but are not vital for the day-to-day operations of the
  Faro library
- `warn` - used to log messages that are important for the end-user to be aware of but do not prevent the library from
  working properly
- `error` - used to log messages that are important for the end-user to be aware of and prevent the library from working
  properly
