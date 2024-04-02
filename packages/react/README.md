# Set up the Faro React distribution of the Faro Web SDK

The Faro Web-SDK is a highly configurable open source real user monitoring (RUM) library built on OpenTelemetry and integrating seamlessly with Grafana Cloud and Grafana Frontend Observability. Faro-React is a distribution of the Faro Web SDK for project using React, which offers easier integrations and the following features:

- **Support for React Router v6 or v4/v5.x**: send events for all route changes, including the data router API
- **Error boundary**: enhancements to stack traces and configuration options for `pushError` behavior
- **Component profiler**: to capture component renders, un/mounting time, and more
- **SSR support** server side rendering support for React

This document covers setting up Faro-React with React Router v6 with or without the data router API, and v4/v5.x.

## React router with data router

The data router API is only available in React Router v6.

// todo: add specific react router version which introduced data routers
// Sean: I couldn't find it

If you use React Router v4/v5x, or want to use React Router v6 without the data router API refer to the [React router without data router](#react-router-without-data-router) section of the documentation.

To upgrade your project to React Router v6 and the data router API, refer to the [Upgrade to a data router](#upgrade-to-a-data-router) section of the documentation.

Follow these steps to set up Faro-React and React Router v6 with the data router API:

1. Install Faro-React package
2. Import and initialize Faro
3. Instrument the data router

## Install Faro

First add Faro-React to your project.

Install the Faro-React npm package using your favorite package manager by running the following shell commands:

NPM:

```sh
# install globally
npm i @grafana/faro-react
```

// todo: is it recommended to install Faro globally, or rather added it to your package.json?
// ? What do you mean by globally or package.json
// -> Faro-React will be automatically added to the package.json by using one of those commands
// -> When faro is initialized it is available globally in the app.

yarn:

```sh
yarn add @grafana/faro-react
```

// todo: CDN install instructions
// -> I double checked, Faro-React will not work with CDN version. Of course there are ways but they are hacky and error prone.

// todo: why would you use CDN vs package manager?
// -> we do not recommend to use the CDN when using faro react.

## Import and initialize Faro

The Faro-React package offers all the functionality and behavior from the Faro Web-SDK package plus additional React specific functionality like router instrumentation, a custom ErrorBoundary, and more.

// Marco: web-tracing needed for React profiler, not for production
// https://react.dev/reference/react/Profiler

The following code sample shows you how to import Faro-React and the minimum setup needed to get insights into the health and performance of your application or website:

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

// what is the correct terminology, instruments or captures?
// --> Instrumenting is the process of hooking into the APIs which emit / where we can pull data from.
// --> Capturing in this regard is capturing the data, processing and sending it.

// I dropped the part about capturing app performance in the runtime, it sounded redundant.
// --> Thanks

After Faro-React is initialized it captures data about your application's health and performance and exports them to a data collector.
// ? What do yu think about something like this:
// --> After Faro-React is initialized it sets up several instrumentation and starts capturing data about your application's health and performance and exports them to a data collector.

// What data collector's does Faro support? Can we link to resources?
// --> Faro supports the Faro receiver which is mandatory for Grafana Cloud. It's auto configured, no additional work required (and i think not possible, will ask the receivers team).
// --> For OSS user it can send data to the Grafana Agent => https://grafana.com/docs/agent/latest/flow/reference/components/faro.receiver/.

### Instrument the data router

ThisIf you are using a

Building on the minimum setup, this section shows you how to instrument the routes from a React data router (BrowserRouter, HashRouter, or MemoryRouter).

In the file you create your data router, often the `App.\*` file pass your data router to the Faro-React function `withFaroRouterInstrumentation` to wrap all your routes with Faro instrumentation:

```ts
const reactBrowserRouter = createBrowserRouter([
  // your routes...
]);

const browserRouter = withFaroRouterInstrumentation(reactBrowserRouter);
```

## Upgrade to a data router

This section describes how to upgrade the Faro React router instrumentation if you already have a
React app instrumented which does not use data routers.

First change the configuration of the ReactInstrumentation inside the `initializeFaro()` function.

1. Change the `version` property from the router version you are using, `ReactRouterVersion.[V4|V5|V6]`,
   to `ReactRouterVersion.V6_data_router`.

2. Update the dependencies provided in the `dependencies` object

If you use React Router v4 or v5:

Remove the `history` and `Route` dependencies and add the `matchRoutes` function exported by
`react-router-dom`

If you use React Router v6, remove the following dependencies from the dependencies `object`:

- `createRoutesFromChildren`
- `Routes`
- `useLocation`
- `useNavigationType`

After you updated the dependencies the ReactIntegration config looks like this:

```ts
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

After you updating the config above, you need to change the router instrumentation in your app.

Since data routers are created with respective functions, for example `createBrowserRouter`, and Routes
are defined differently, the Faro customer route components need to be removed because they do not work
with data routers.

- If you upgrade from React Router v4 or v5 remove the `<FaroRoute/>` components.
- If you upgrade from React Router v6 then remove `<FaroRoutes />` components.

To instrument the newly created data router, it must be wrapped by the
`withFaroRouterInstrumentation(dataRouter)` function:

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
