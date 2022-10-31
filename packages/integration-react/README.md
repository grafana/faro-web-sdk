# @grafana/agent-integration-react

**DEPRECATED** _Project has been moved to [@grafana/faro-react](https://www.npmjs.com/package/@grafana/faro-react)_

Grafana JavaScript Agent package that enables easier integration in projects built with React.

_Warning_: currently pre-release and subject to frequent breaking changes. Use at your own risk.

Out of the box, the package provides you the following features:

- Error Boundary - Provides additional stacktrace for errors
- Component Profiler - Capture every re-render of a component, the un/mounting time etc.
- Router (v4-v6) integration - Send events for all route changes
- SSR support

## Installation

```ts
import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';

import {
  getWebInstrumentations,
  initializeGrafanaAgent,
  ReactIntegration,
  ReactRouterVersion,
} from '@grafana/agent-integration-react';
import { TracingInstrumentation } from '@grafana/agent-tracing-web';

initializeGrafanaAgent({
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

## Usage

### Error Boundary

```tsx
import { GrafanaAgentErrorBoundary } from '@grafana/agent-integration-react';

// during render
<GrafanaAgentErrorBoundary>
  <App />
</GrafanaAgentErrorBoundary>;
```

or

```tsx
import { withErrorBoundary } from '@grafana/agent-integration-react';

export default withErrorBoundary(App);
```

### Router

### V6

```tsx
import { GrafanaAgentRoutes } from '@grafana/agent-integration-react';

// during render
<GrafanaAgentRoutes>
  <Route path="/" element={<Home />} />
  {/* ... */}
</GrafanaAgentRoutes>;
```

### V4/v5

```tsx
import { GrafanaAgentRoute } from '@grafana/agent-integration-react';

// during render
<Switch>
  <GrafanaAgentRoute path="/">
    <Home />
  </GrafanaAgentRoute>
  {/* ... */}
</Switch>;
```

### Profiler

```tsx
import { withGrafanaAgentProfiler } from '@grafana/agent-integration-react';

export default withGrafanaAgentProfiler(App);
```
