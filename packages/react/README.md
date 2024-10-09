# @grafana/faro-react

Faro package that enables easier integration in projects built with React.

Out of the box, the package provides you the following features:

- Error Boundary - Provides additional stacktrace for errors and configuration options for
  pushError behavior
- Component Profiler - Capture every re-render of a component, the un/mounting time etc.
- Router (v4-v6) integration - Send events for all route changes
- SSR support

The Faro Web SDK is a highly configurable open source real user monitoring (RUM) library built on
OpenTelemetry and integrating seamlessly with Grafana Cloud and Grafana Frontend Observability.

Faro-React is a distribution of the Faro Web SDK for project using React, which offers easier
integrations and the following features:

- **Support for React Router v6 or v4/v5.x**: send events for all route changes, including the data
  router API
- **Error boundary**: enhancements to stack traces and configuration options for pushError behavior
- **Component profiler**: to capture component renders, un/mounting time, and more
- **Server side rendering (SSR) support**

## Install the Faro-React Web SDK

First add Faro-React to your project. Install the Faro-React package by running the following command
for NPM:

```sh
npm i @grafana/faro-react
```

Or with Yarn:

```sh
yarn add @grafana/faro-react
```

The Faro-React package offers all the functionality and behavior from the Faro Web SDK package plus
additional React specific functionality like router instrumentation, a custom ErrorBoundary, and more.

Add the following code snippet to your project to import Faro-React with the minimum setup needed to
get insights into the health and performance of your application or website:

```ts
import { initializeFaro } from '@grafana/faro-react';

initializeFaro({
  // required: the URL of the Grafana collector
  url: 'my/collector/url',

  // required: the identification label of your application
  app: {
    name: 'my-react-app',
  },
});
```

Faro-React captures data about your application’s health and performance and exports them to the
configured collector like Grafana Alloy.

## Instrument your application

The Faro-React package offers all the functionality and behavior from the Faro Web SDK package plus
additional React specific functionality like router instrumentation, a custom ErrorBoundary, and more.

### Router v6 with Data Router

```ts
import {
  initializeFaro,
  createReactRouterV6DataOptions,
  ReactIntegration,
  getWebInstrumentations,
} from '@grafana/faro-react';

import { matchRoutes } from 'react-router-dom';

initializeFaro({
  // ...

  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),

    new ReactIntegration({
      router: createReactRouterV6DataOptions({
        matchRoutes,
      }),
    }),
  ],
});
```

Instrument the routes from a React data router (`BrowserRouter`, `HashRouter`, or `MemoryRouter`).

In the file you create your data router, often the App.\* file pass your data router to the Faro-React
function `withFaroRouterInstrumentation` to wrap all your routes and apply Faro auto instrumentation:

```ts
import { createBrowserRouter } from 'react-router-dom';

const reactBrowserRouter = createBrowserRouter([
  // your routes...
]);

const browserRouter = withFaroRouterInstrumentation(reactBrowserRouter);
```

### Router v6 (no Data Router)

In the file you define your router, import `createRoutesFromChildren`, `matchRoutes`, `Routes`,
`useLocation`, `useNavigationType` from `react-router-dom` and pass them to the dependencies object.

```ts
import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';

import {
  createReactRouterV6Options,
  getWebInstrumentations,
  initializeFaro,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/faro-react';

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
      router: createReactRouterV6Options({
        createRoutesFromChildren,
        matchRoutes,
        Routes,
        useLocation,
        useNavigationType,
      }),
    }),
  ],
});
```

To instrument React Router v6 import the `<FaroRoutes/>` component and use it instead of the React
router `<Routes />` component, for example:

```tsx
import { FaroRoutes } from '@grafana/faro-react';

// during render
<FaroRoutes>
  <Route path="/" element={<Home />} />
  {/* ... */}
</FaroRoutes>;
```

### Router v4/v5

To instrument React Router v4 or v5, import the `Route` component from `react-router-dom` and the
`history` object from the `history package` and pass them to the dependencies object:

The final result should look similar like this example:

```ts
import { createBrowserHistory } from 'history';
import { Route } from 'react-router-dom';

import {
  // or createReactRouterV4Options
  createReactRouterV5Options,
  getWebInstrumentations,
  initializeFaro,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/faro-react';

const history = createBrowserHistory();

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
      // or createReactRouterV4Options
      router: createReactRouterV5Options({
        history, // the history object used by react-router
        Route, // Route component imported from react-router package
      }),
    }),
  ],
});
```

To instrument React Router v4, v5 import the `<FaroRoute/>` component and use it instead of the
React router `<Route />` component, for example:

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

## React ErrorBoundary support

React Error boundaries are components that allow you to render a fallback UI in case an error occurs
in the respective React component tree.

Faro provides its own error boundary component which enhances the standard React error boundary with
Faro specific functionality.

In case of an error it sends a Faro error event which contains the error message, the React component
stack of the component which contains the exception, and the name of name of the error boundary
if configured.

```ts
import { initializeFaro } from '@grafana/faro-react';

initializeFaro({
  // required: the URL of the Grafana collector
  url: 'my/collector/url',

  // required: the identification label of your application
  app: {
    name: 'my-react-app',
  },

  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),

    // Must be initialized to get FaroErrorBoundary support
    new ReactIntegration(),
  ],
});
```

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

### FaroErrorBoundary properties

Configuration options:

- `fallback`: The fallback UI to render instead, either:
  - a `ReactElement`
  - `FaroErrorBoundaryFallbackRender` function that passes the Error object and a callback function
    to reset the error boundary to it’s initial state when called
- `pushErrorOptions`: Options passed to the pushError API, for example additional context to an error

Lifecycle callbacks:

- `beforeCapture`: Executed before the Faro pushError API call, with the Error object as a parameter
- `onError`: Executed when an error occurs, with the Error object as a parameter
- `onMount`: Executed when React calls the componentDidMount lifecycle hook
- `onUnmount`: Executed when React calls the componentWillUnmount lifecycle hook, with the Error
  object as a parameter
- `onReset`: Executed when React calls resetErrorBoundary, with the Error object as a parameter

```tsx
import { FaroErrorBoundary, PushErrorOptions } from '@grafana/faro-react';

const pushErrorOptions: PushErrorOptions = {
  type: "Custom Error Type"
  context: {
    foo: "bar",
    baz: "abc"
  },
};

// during render
<FaroErrorBoundary
  beforeCapture={(error) => handleBeforeCapture(error)}
  onError={(error) => handleError(error)}
  onMount={() => handleOnMount()}
  onUnmount={(error) => handleUnmount(error)}
  onReset={(error) => handleReset(error)}
  pushErrorOptions={pushErrorOptions}
  fallback={(error, resetBoundary) => {
    return errorBoundaryFallbackRenderer(error, resetBoundary) }}
 >
  <App />
</FaroErrorBoundary>;
```

## React server side rendering support

Follow this guide to learn how to initialize your Faro instrumentation to support React Server Side
Rendering (SSR) for:

React Router v6 without a data router:

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

React Router v6 with a data router:

Wrap your data router with `withFaroRouterInstrumentation(dataRouter)` in your routes file.

React Router v5:

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

## React component profiling

Follow this guide to setup and use the Faro Profiler to get insights into the render performance of
a React components.

> WARNING
> Using the profiler has an impact on performance and should not be used in production.

To use the Faro profiler, import the Faro web-tracing package and initialize Faro-React as follows:

```ts
import { withFaroProfiler } from '@grafana/faro-react';

export default withFaroProfiler(MyReactComponent);
```

## Upgrading from a v4, v5, v6 router to data router

This section describes how to upgrade the Faro React router instrumentation if you already have a
React app instrumented which doesn’t use data routers.

In the `ReactIntegration` call, change the `version` property from `ReactRouterVersion.[V4|V5|V6]` to
`ReactRouterVersion.V6_data_router`.

If you use React Router v4 or v5 remove the `history` and `Route` dependencies and add the `matchRoutes`
function exported by `react-router-dom`.

If you use React Router v6 remove the following dependencies from the dependencies object:

- `createRoutesFromChildren`
- `Routes`
- `useLocation`
- `useNavigationType`

The ReactIntegration call should look similar to:

```tsx
import { matchRoutes } from 'react-router-dom';

import { getWebInstrumentations, initializeFaro, ReactIntegration, ReactRouterVersion } from '@grafana/faro-react';

initializeFaro({
  // ...

  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),

    new ReactIntegration({
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
