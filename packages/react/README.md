# Set up Faro React distribution of the Faro Web SDK

// Overview of recommended and advanced

Faro package that enables easier integration in projects built with React.

Out of the box, the package provides you the following features:

- **Error Boundary**: provides additional stack trace for errors and configuration options for pushError behavior
- **Component Profiler**: capture every re-render of a component, the un/mounting time etc.
- **React Router (v4 - v6) integration**: send events for all route changes
- **SSR support**

## React router with data router

To set up Faro-React with React Router V6 without Data routers

1. Set up Faro
2. Instrument the data router

Set up Faro:

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
        version: ReactRouterVersion.V6_data_router,
        dependencies: {
          matchRoutes,
        },
      },
    }),
  ],
});
```

To instrument the router wrap it with the `withFaroRouterInstrumentation(dataRouter)` function,
which attaches teh Faro instrumentations to the router.
This is usually done in the file where you create the router, often this App.\* file.

Steps:

1. Create a data router (createBrowserRouter, createHashRouter, createMemoryRouter)
2. Instrument the data router to receive route changes by wrapping it with `withFaroRouterInstrumentation()`

```ts
const reactBrowserRouter = createBrowserRouter([
  //...
]);

const browserRouter = withFaroRouterInstrumentation(reactBrowserRouter);
```

_upgrading from v6 to v6 data router_

1. Change `version` property from `ReactRouterVersion.V6` to `ReactRouterVersion.V6_data_router`.
2. Remove the following dependencies from the dependencies object

- `createRoutesFromChildren`
- `Routes`
- `useLocation`
- `useNavigationType`

Example: updating dependencies

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
        // version: ReactRouterVersion.V6 // => change to .V6_data_router,
        version: ReactRouterVersion.V6_data_router,
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

Updating the router instrumentation

1. Remove `<FaroRoutes>` component. This will not work anymore with V6 data routers.
2. Create a data router and wrap it with `withFaroRouterInstrumentation(dataRouter)`

Example: Instrument Router

```ts
const reactBrowserRouter = createBrowserRouter([
  // your routes
]);

const browserRouter = withFaroRouterInstrumentation(reactBrowserRouter);
```

## React router without

To set up Faro-React with React Router V5 or V6 without Data routers, add the following code snippet
to your project. If you use React Router V6 with Data Routers, refer to the React Router with Data
Routers section.

_v6_

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
    }),
  ],
});
```

_instrument routes_

```tsx
import { FaroRoutes } from '@grafana/faro-react';

// during render
<FaroRoutes>
  <Route path="/" element={<Home />} />
  {/* ... */}
</FaroRoutes>;
```

_v5_

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

_instrument routes_

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

## Error boundary

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

_pushErrorOptions prop_

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
```

```html
<!-- during render -->
<FaroErrorBoundary pushErrorOptions="{pushErrorOptions}"> <App /> </FaroErrorBoundary>;
```

## Component profiler

```tsx
import { withFaroProfiler } from '@grafana/faro-react';

export default withFaroProfiler(App);
```

## SSR support

When using SSR, Faro needs to initialized a bit differently for the server side.
Setup for the client side is as mentioned above.

_v6_

```tsx
import { FaroErrorBoundary, setReactRouterV6SSRDependencies } from '@grafana/faro-react';
setReactRouterV6SSRDependencies({ Routes });

export function renderToString(...) {
  return reactRenderToString(
    <FaroErrorBoundary>
      <StaticRouter location={...}>
        <App />
      </StaticRouter>
    </FaroErrorBoundary>
  ),
}
```

_v6 data router_
No special config needed.
Just wrap your data router with `withFaroRouterInstrumentation(dataRouter)` in your routes file.

_v5_

```tsx
import { FaroErrorBoundary, setReactRouterV4V5SSRDependencies } from '@grafana/faro-react';
setReactRouterV4V5SSRDependencies({ Route, history });

export function renderToString(...) {
  return reactRenderToString(
    <FaroErrorBoundary>
      <StaticRouter location={...}>
        <App />
      </StaticRouter>
    </FaroErrorBoundary>
  ),
}
```
