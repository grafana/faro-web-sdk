# Set up the Faro React distribution of the Faro Web SDK

Faro-Faro is a distribution of the Faro Web SDK for project using React, which offers easier integrations and the following features:

- **Support for React Router (v4 - v6)**: send events for all route changes
- **Error boundary**: enhancements to stack traces and configuration options for `pushError` behavior
- **Component profiler**: to capture component renders, un/mounting time, and more
- **SSR support** server side rendering support for React

todo: questions:

- Why do we support v4-v6, are these all the current supported versions of React?
- Is **Error boundary** as standard industry term or our own naming?

The recommended way to use Faro-React is with the latest version of React Router V6 and the data router API. Why? for example: latest supported development, x, y, feature that makes routing easier?

If you use an older version of React Router, V4-V5, or want to use React Router V6 without the data router API refer to the [React router without data router](#react-router-without-data-router) section of the documentation.

To upgrade your project to React Router V6 and the data router API, refer to the [Upgrade to a data router](#upgrade-to-a-data-router) section of the documentation.

## React router with data router

The data router API is only available in React Router V6. Follow these steps to set up Faro-React and React Router V6 with the data router API:

1. Install Faro
2. Import and initialize Faro
3. Instrument the data router

## Install Faro

First add the Faro-React and Faro web tracing dependencies to your project and install them:

```
todo: yarn, npm dependencies
```

## Import and initialize Faro

Next import Faro-React and Faro web tracing dependencies in your project and initialize Faro with the following configuration:

todo: questions:
- Is there anything specific in the config we need to note here?
- Is matchRoutes a standard way React exports routes?
- Can there be any other dependencies?
- Can we direct people to find the full list of configuration options?

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

### Instrument the data router

To instrument the router, pass it to the `withFaroRouterInstrumentation(dataRouter)` function, which will wrap all routing with Faro instrumentation.

This is usually done in the file where you create the router, often the `App.\*` file.

todo: questions:

- We go straight into this next section, can we explain what we are trying to achieve by following the steps?
- We also introduce three router options (createBrowserRouter, createHashRouter, createMemoryRouter), what are the differences and why would someone use one over another?

Steps:

1. Create a data router (createBrowserRouter, createHashRouter, createMemoryRouter)
2. Instrument the data router to receive route changes by wrapping it with `withFaroRouterInstrumentation()`

```ts
const reactBrowserRouter = createBrowserRouter([
  //...
]);

const browserRouter = withFaroRouterInstrumentation(reactBrowserRouter);
```

## Upgrade to a data router

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

## React router without data router

To set up Faro-React with React Router V4, V5 or V6 without Data routers, add the following code snippet
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
