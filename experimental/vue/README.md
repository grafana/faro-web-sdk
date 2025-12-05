# @grafana/faro-vue

Faro Vue 3 integration.

## Installation

```bash
npm install @grafana/faro-vue @grafana/faro-web-sdk
```

Requires `vue@^3.0.0` and `vue-router@^4.0.0` as peer dependencies.

## Quick Start

```typescript
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { initializeFaro } from '@grafana/faro-web-sdk';
import { FaroVuePlugin } from '@grafana/faro-vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    /* ... */
  ],
});

initializeFaro({
  url: 'https://collector.example.com/collect',
  app: { name: 'my-app', version: '1.0.0' },
});

const app = createApp(App);
app.use(router);
app.use(FaroVuePlugin, { router });
app.mount('#app');
```

This automatically instruments:

- Global error handler
- Global warning handler (dev only)
- All component performance (mount, update, lifecycle)
- Vue Router navigation

## Options

```typescript
interface FaroVuePluginOptions {
  instrumentComponents?: boolean; // default true
  instrumentError?: boolean; // default true
  instrumentWarn?: boolean; // default true
  router?: Router; // Vue Router instance
}
```

Disable features:

```typescript
app.use(FaroVuePlugin, {
  instrumentComponents: false, // disable global component tracking
  instrumentWarn: false, // disable warning tracking
});
```

## Advanced Usage

### Track Specific Components Only

Use `FaroProfiler` to track individual components instead of the global mixin:

```vue
<template>
  <FaroProfiler name="ExpensiveComponent">
    <ExpensiveComponent />
  </FaroProfiler>
</template>

<script setup lang="ts">
import { FaroProfiler } from '@grafana/faro-vue';
</script>
```

Or use the composable:

```vue
<script setup lang="ts">
import { useFaroProfiler } from '@grafana/faro-vue';

useFaroProfiler('MyComponent');
</script>
```

### Error Boundary

```vue
<template>
  <FaroErrorBoundary :fallback="fallback">
    <MyComponent />
  </FaroErrorBoundary>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { FaroErrorBoundary } from '@grafana/faro-vue';

const fallback = (error: Error, reset: () => void) =>
  h('div', [h('h1', 'Error'), h('button', { onClick: reset }, 'Retry')]);
</script>
```

Or use the composable:

```vue
<script setup lang="ts">
import { useFaroErrorBoundary } from '@grafana/faro-vue';

const { state, resetErrorBoundary } = useFaroErrorBoundary({
  onError: (error, instance, info) => console.log('Error:', error),
});
</script>
```

## Events Sent

- `faro.vue.performance.component.mount` - Component mount duration
- `faro.vue.performance.component.update` - Component update duration
- `faro.vue.performance.component.lifecycle` - Component lifetime (mount to unmount)
- `EVENT_ROUTE_CHANGE` - Route navigation with duration

## License

Apache-2.0
