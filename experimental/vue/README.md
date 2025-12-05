# @grafana/faro-vue

Faro Vue 3 integration providing router instrumentation and error boundary.

## Installation

```bash
npm install @grafana/faro-vue @grafana/faro-web-sdk
```

Requires `vue@^3.0.0` and `vue-router@^4.0.0` as peer dependencies.

## Setup

```typescript
import { initializeFaro } from '@grafana/faro-web-sdk';
import { setDependencies } from '@grafana/faro-vue';

const faro = initializeFaro({
  url: 'https://collector.example.com/collect',
  app: { name: 'my-app', version: '1.0.0' },
});

// Required for error boundary
setDependencies(faro.internalLogger, faro.api);
```

## Router Instrumentation

Tracks route changes using Vue Router's `afterEach` hook.

```typescript
import { createRouter, createWebHistory } from 'vue-router';
import { VueRouterInstrumentation } from '@grafana/faro-vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    /* ... */
  ],
});

initializeFaro({
  // ...
  instrumentations: [new VueRouterInstrumentation({ router })],
});
```

Captures: `toRoute` (route pattern), `fromRoute`, `toUrl` (full URL).

## Error Boundary

### Component

```vue
<template>
  <FaroErrorBoundary :fallback="fallbackComponent">
    <MyComponent />
  </FaroErrorBoundary>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { FaroErrorBoundary } from '@grafana/faro-vue';

const fallbackComponent = (error: Error, reset: () => void) => {
  return h('div', [h('h1', 'Error occurred'), h('button', { onClick: reset }, 'Retry')]);
};
</script>
```

### Composable

```vue
<script setup lang="ts">
import { useFaroErrorBoundary } from '@grafana/faro-vue';

const { state, resetErrorBoundary } = useFaroErrorBoundary({
  onError: (error, instance, info) => {
    console.log('Error:', error, 'Source:', info);
  },
});
</script>
```

Uses Vue's `onErrorCaptured` hook. Captures error, component instance, and error source info.

## Available Options

```typescript
interface VueRouterInstrumentationOptions {
  router: Router;
}

interface FaroErrorBoundaryProps {
  beforeCapture?: (error: Error | null) => void;
  fallback?: VNode | ((error: Error, reset: () => void) => VNode);
  onError?: (error: Error, instance: ComponentPublicInstance | null, info: string) => void;
  onReset?: (error: Error | null) => void;
  pushErrorOptions?: PushErrorOptions;
}
```

## License

Apache-2.0
