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
```

## Global Error & Warning Handlers

Registers global Vue error (`errorHandler`) and warning (`warnHandler`) handlers.

```typescript
import { createApp } from 'vue';
import { FaroVuePlugin } from '@grafana/faro-vue';

const app = createApp(App);
app.use(FaroVuePlugin);
app.mount('#app');
```

By default, this plugin:

- Registers global error handler
- Registers global warning handler
- Enables automatic performance tracking for all components

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

Captures: `toRoute` (route pattern), `fromRoute`, `toUrl` (full URL), `duration` (navigation duration in ms).

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

## Performance Profiling

Tracks component mount, update, and lifecycle durations using `performance.now()` and sends custom events.

### Component

```vue
<template>
  <FaroProfiler name="MyComponent">
    <MyComponent />
  </FaroProfiler>
</template>

<script setup lang="ts">
import { FaroProfiler } from '@grafana/faro-vue';
</script>
```

### Composable

```vue
<script setup lang="ts">
import { useFaroProfiler } from '@grafana/faro-vue';

useFaroProfiler('MyComponent');
</script>
```

Events sent: `faro.vue.component` with attributes:

- `phase`: 'mount' | 'update' | 'lifecycle'
- `name`: Component name
- `duration`: Duration in milliseconds

- `mount`: `setup` start -> `onMounted`
- `update`: `onBeforeUpdate` -> `onUpdated`
- `lifecycle`: `onMounted` -> `onUnmounted` (component lifetime)

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

interface FaroVuePluginOptions {
  instrumentComponents?: boolean; // default true
  instrumentError?: boolean; // default true
  instrumentWarn?: boolean; // default true
}
```

## License

Apache-2.0
