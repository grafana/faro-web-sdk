# Set up the Faro React distribution of the Faro Web SDK

Faro-React is a distribution of the Faro Web SDK for project using React, which offers easier integrations and the following features:

// Sean: what is Faro web-sdk

- **Support for React Router (v4 - v6)**: send events for all route changes
- **Error boundary**: enhancements to stack traces and configuration options for `pushError` behavior
- **Component profiler**: to capture component renders, un/mounting time, and more
- **SSR support** server side rendering support for React

todo: questions:

- Why do we support v4-v6, are these all the current supported versions of React? // v4/v5.x

If you use React Router v4-v5, or want to use React Router v6 without the data router API refer to the [React router without data router](#react-router-without-data-router) section of the documentation.

To upgrade your project to React Router v6 and the data router API, refer to the [Upgrade to a data router](#upgrade-to-a-data-router) section of the documentation.

## React router with data router

The data router API is only available in React Router v6. Follow these steps to set up Faro-React and React Router v6 with the data router API: // add specific react router version which introduced data routers

1. Install Faro-React package
2. Import and initialize Faro
3. Instrument the data router

## Install Faro

First add Faro-React to your project.

Install the Faro-React npm package using your favorite package manager.

After Faro is installed all its APIs can be used in your code by importing them.

npm

```
npm i @grafana/faro-react
```

yarn

```
yarn add @grafana/faro-react
```

// Note to Sean:

## Import and initialize Faro

Next import Faro-React in your project and initialize Faro.

The Faro-React package brings all functionality anf behavior from the Faro Web-SDK package plus additional
React specific functionality and option which are described throughout this guide.

In it's default setup it simply is the same as the the Faro Web-SDK. Throughout this guide we explain
how to enable get React specific functionality like router instrumentation or a custom ErrorBoundary
and more.

// Marco (later): why web-tracing? Only needed if React profiler is used (is not recommended for production because it adds performance overhead)
// https://react.dev/reference/react/Profiler

todo: questions:

- Is there anything specific in the config we need to note here? // profiler, mention that react package can be used without using setting up the router, but doesn't give any insights into react specific metric.

- Is matchRoutes a standard way React exports routes? // yes
- Can we direct people to find the full list of configuration options? // "next" section, send custom events

The following instructions are the bare minimum to setup Faro-React to get insights into
the health and performance of your app or site.

After Faro-React is initialized it captures data about your apps health and performance
within your application’s runtime.

NPM package

```ts
import { initializeFaro } from '@grafana/faro-react';

initializeFaro({
  // Mandatory, the URL of the Grafana collector
  url: 'my/collector/url',

  // Mandatory, the identification label of your application
  app: {
    name: 'my-react-app',
  },
});
```

### Instrument the data router

To instrument the router, pass it to the `withFaroRouterInstrumentation(dataRouter)` function, which wraps all routes with Faro instrumentation.

This is usually done in the file where you create the router, often the `App.\*` file.

todo: questions:

- Marco: We go straight into this next section, can we explain what we are trying to achieve by following the steps?

Steps:

1. Create a data router (createBrowserRouter, createHashRouter, createMemoryRouter)
2. Instrument the data router to receive route changes by wrapping it with `withFaroRouterInstrumentation()`

```ts
const reactBrowserRouter = createBrowserRouter([
  // your routes...
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
import { matchRoutes } from 'react-router-dom';

import { getWebInstrumentations, initializeFaro, ReactIntegration, ReactRouterVersion } from '@grafana/faro-react';

initializeFaro({
  // Mandatory, the URL of the Grafana collector
  url: 'my/collector/url',

  // Mandatory, the identification label of your application
  app: {
    name: 'my-react-app',
  },

  // ...

  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),

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
  // Mandatory, the URL of the Grafana collector
  url: 'my/collector/url',

  // Mandatory, the identification label of your application
  app: {
    name: 'my-react-app',
  },

  // ...

  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),

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
  // Mandatory, the URL of the Grafana collector
  url: 'my/collector/url',

  // Mandatory, the identification label of your application
  app: {
    name: 'my-react-app',
  },

  // ...

  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),

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

Use the Faro Profiler to get insights into the rendering performance on a React component level.
To use the Faro profiler you need to install the Faro web-tracing package.

Note:
Using the profiler has an impact on performance.
We recommend to use it carefully and to not overutilize it by instrumenting many components.

Initialize Faro React

```ts
import { matchRoutes } from 'react-router-dom';

import { getWebInstrumentations, initializeFaro } from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

initializeFaro({
  // Mandatory, the URL of the Grafana collector
  url: 'my/collector/url',

  // Mandatory, the identification label of your application
  app: {
    name: 'my-react-app',
  },

  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),

    // Tracing Instrumentation is needed if you want to use the React Profiler
    new TracingInstrumentation(),

    // ...
  ],
});
```

```tsx
import { withFaroProfiler } from '@grafana/faro-react';

export default withFaroProfiler(MyReactComponent);
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
