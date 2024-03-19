# @grafana/faro-react

Faro package that enables easier integration in projects built with React.

Out of the box, the package provides you the following features:

- Error Boundary - Provides additional stacktrace for errors and configuration options for pushError behavior
- Component Profiler - Capture every re-render of a component, the un/mounting time etc.
- Router (v4-v6) integration - Send events for all route changes
- SSR support

## Installation

### Use with React Router 5 and 6 (no Data Routers)

This describes how to setup Faro-React to use with React Router V5 and V6.
If you use React Router V6 with the Data API please refer to the next section.

```ts
import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';

import { getWebInstrumentations, initializeFaro, ReactIntegration, ReactRouterVersion } from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

initializeFaro({
  // ...
  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),

    // Tracing Instrumentation is needed if you want to use the React Profiler
    new TracingInstrumentation(),

    new ReactIntegration({
      // Only needed if you want to use the React Router instrumentation
      router: {
        version: ReactRouterVersion.V6,
        dependencies: {
          createRoutesFromChildren,
          matchRoutes,
          Routes,
          useLocation,
          useNavigationType,
        },
      },

      // Or if you use react-router v4/v5
      router2: {
        version: ReactRouterVersion.V5, // or ReactRouterVersion.V4,
        dependencies: {
          history, // the history object used by react-router
          Route, // Route component imported from react-router package
        },
      },
    }),
  ],
});
```

### Use with React Router v6 Data Routers

```ts
import { matchRoutes } from 'react-router-dom';

import { getWebInstrumentations, initializeFaro, ReactIntegration, ReactRouterVersion } from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

initializeFaro({
  // ...
  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),

    // Tracing Instrumentation is needed if you want to use the React Profiler
    new TracingInstrumentation(),

    new ReactIntegration({
      // Only needed if you want to use the React Router instrumentation
      router: {
        version: ReactRouterVersion.V6_data_api,
        dependencies: {
          matchRoutes,
        },
      },
    }),
  ],
});

// To instrument the router you need to attach Faro instrumentations providing it to the withFaroRouterInstrumentation function
// Do this in your App.js or other file where you create the router.

const reactBrowserRouter = createBrowserRouter([
  //...
]);

const browserRouter = withFaroRouterInstrumentation(reactBrowserRouter);
```

### Error Boundary

```tsx
import { FaroErrorBoundary } from '@grafana/faro-react';

// during render
<FaroErrorBoundary>
  <App />
</FaroErrorBoundary>;
```

or

```tsx
import { withErrorBoundary } from '@grafana/faro-react';

export default withErrorBoundary(App);
```

#### pushErrorOptions prop

```tsx

import { FaroErrorBoundary, PushErrorOptions } from '@grafana/faro-react';

const pushErrorOptions: PushErrorOptions = {
  type: "Custom Error Type"
  context: {
    foo: "bar",
    baz: "qux"
  },
  // ...
}

// during render
<FaroErrorBoundary pushErrorOptions={pushErrorOptions}>
  <App />
</FaroErrorBoundary>;
```

### Router

### V6

```tsx
import { FaroRoutes } from '@grafana/faro-react';

// during render
<FaroRoutes>
  <Route path="/" element={<Home />} />
  {/* ... */}
</FaroRoutes>;
```

### V6 Data Router

1. Create a data router (createBrowserRouter, createHashRouter, createMemoryRouter)
2. Instrument the data router to receive route changes by wrapping it with `withFaroRouterInstrumentation()`

```ts
const reactBrowserRouter = createBrowserRouter([
  //...
]);

const browserRouter = withFaroRouterInstrumentation(reactBrowserRouter);
```

### V4/v5

```tsx
import { FaroRoute } from '@grafana/faro-react';

// during render
<Switch>
  <FaroRoute path="/">
    <Home />
  </FaroRoute>
  {/* ... */}
</Switch>;
```

#### Upgrading from instrumented V6 router to V6 data router

1. Change router config
   1.1 Change `version` property from `ReactRouterVersion.V6` to `ReactRouterVersion.V6_data_api`.
   1.2 Remove the following dependencies from teh dependencies object
   - `createRoutesFromChildren`
   - `Routes`
   - `useLocation`
   - `useNavigationType`

**Example: updating dependencies**

```ts
initializeFaro({
  // ...
  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),

    // Tracing Instrumentation is needed if you want to use the React Profiler
    new TracingInstrumentation(),

    new ReactIntegration({
      // Only needed if you want to use the React Router instrumentation
      router: {
        // version: ReactRouterVersion.V6 // => change to .V6_data_api,
        version: ReactRouterVersion.V6_data_api,
        dependencies: {
          matchRoutes,
          // +++ remove the following dependencies +++
          // createRoutesFromChildren,
          // Routes,
          // useLocation,
          // useNavigationType,
        },
      },
    }),
  ],
});
```

2. Change Router instrumentation
   2.1 Remove `<FaroRoutes>` component. This will not work anymore with V6 data routers.
   2.2 Create a data router and wrap it with `withFaroRouterInstrumentation(dataRouter)`

**Example: Instrument Router**

```ts
const reactBrowserRouter = createBrowserRouter([
  // your routes
]);

const browserRouter = withFaroRouterInstrumentation(reactBrowserRouter);
```

### Profiler

```tsx
import { withFaroProfiler } from '@grafana/faro-react';

export default withFaroProfiler(App);
```
