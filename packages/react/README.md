# @grafana/faro-react

Faro package that enables easier integration in projects built with React.

_Warning_: currently pre-release and subject to frequent breaking changes. Use at your own risk.

Out of the box, the package provides you the following features:

- Error Boundary - Provides additional stacktrace for errors and configuration options for pushError behavior
- Component Profiler - Capture every re-render of a component, the un/mounting time etc.
- Router (v4-v6) integration - Send events for all route changes
- SSR support

## Installation

### Use with React Router 5 and 6 (without Data API)

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

### Use with React Router v6 Data API

## Usage

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

### Profiler

```tsx
import { withFaroProfiler } from '@grafana/faro-react';

export default withFaroProfiler(App);
```
