# Initialization process

The initialization process is pretty complex as it has to deal with a lot of components. Below is a step by step
description of how it is initialized under the hood.

Please refer to the components documentation for more details about each component.

## Core package

### [1. Unpatched Console][components-unpatched-console]

The first component that is initialized is the unpatched console because it is needed because it is needed by the
internal logger component. By default, the unpatched console is initialized with the global `console` object but it can
be overwritten by the user if it is provided in the config object.

### [2. Internal Logger][components-internal-logger]

The internal logger is initialized immediately after the unpatched console but before anything else happens because it
is needed to print out debug messages. The internal logger relies on the unpatched console and not on the `console`
object because the latter can be overwritten by instrumentations and we don't want to send those debug messages as
signals.

### Isolation check

Before any other component is initialized, we run an isolation check.

By default, Faro is a global singleton that can be initialized only once. However, multiple instances can be initialized
by marking them as isolated using the `isolate` config option. This is useful in large applications that contain
multiple sub-applications which should be instrumented independently.

The process of isolation check is pretty easy: when a singleton Faro instance is initialized, we define it on the
global object of the environment (either `window` in browsers or `global` in Node.js). If we detect that there is an
instance already initialized, we stop the process here.

However, the isolation mode should not be mistaken with global object exposure. The global object exposure is a way to
make Faro available to the end-user on the global object. Two Faro instances can be instantiated as isolated but they
can still be exposed on the global object independently of each other.

### [3. Metas][components-metas]

The metas are the next component that is initialized as they are required by all subsequent components. The API requires
it because whenever a signal is sent, the immediate meta values are added to it in order to keep them in sync. The
instrumentations and transports require the metas for exposing them to the developers that are writing their own
instrumentations and transports.

However, the default metas values are not registered at this stage (check the [Initial values][initial-values] section
below for more details).

### [4. Transports][components-transports]

The next component that is initialized is the transports components. It comes before the API component because the API
is accessing it internally to pass the signals. However, the transports should also not be aware of the API component
because they should not do anything with it.

However, the transports passed in the config are not registered at this stage (check the
[Initial values][initial-values] section below for more details).

### [5. API][components-api]

The API is the next loaded component. It is initialized before the instrumentations component as the instrumentations
require the API methods to be available in order to inject them in every instrumentation.

### [6. Instrumentations][components-instrumentations]

The instrumentations component is the last component that is initialized. They are initialized after everything else
since they do rely on the others. For example, the API methods are used to send signals, the metas are used to take
decisions on the value etc.

However, the instrumentations passed in the config are not registered at this stage (check the
[Initial values][initial-values] section below for more details).

### 7. The Faro SDK

Once all the components are initialized, we can finally build the global `faro` object. This object is then exposed
via the `faro` object that end-users can import from the npm package. The same object is also exposed on the global
object if `preventGlobalExposure` config property was not passed. However, if the global object already contains a
property with the same name, a warning message will be printed in the console but the process will continue.

### Initial values

Once all the components are initialized, we can finally register the initial values. The default metas are added first,
then the transports and finally the instrumentations.

## Web SDK

## Tracing

[initial-values]: #initial-values
[components-api]: ./components/api.md
[components-instrumentations]: ./components/instrumentations.md
[components-internal-logger]: ./components/internal-logger.md
[components-metas]: ./components/metas.md
[components-transports]: ./components/transports.md
[components-unpatched-console]: ./components/unpatched-console.md
