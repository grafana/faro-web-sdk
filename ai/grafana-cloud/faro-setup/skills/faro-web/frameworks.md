# Framework implementation reference

These are the framework-specific patterns for Step 2 (Base implementation) of the `faro-web` skill. Use the section that matches the detected framework. Replace `<COLLECTOR_URL>`, `<APP_NAME>`, and `<VERSION>` with the values from Step 1.

---

## React (any router, base setup)

**Install:**

```
[package-manager] add @grafana/faro-react @grafana/faro-web-tracing
```

**Create `src/faro.ts`:**

```ts
import { initializeFaro, getWebInstrumentations } from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

initializeFaro({
  url: '<COLLECTOR_URL>',
  app: {
    name: '<APP_NAME>',
    version: '<VERSION>', // read from package.json version field
    environment: process.env.NODE_ENV,
  },
  instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
});
```

Replace `<VERSION>` with the literal version string read from `package.json` (e.g. `'1.0.0'`), or with `process.env.REACT_APP_VERSION` / `import.meta.env.VITE_APP_VERSION` if the project has such a variable.

**Wire:** Add `import './faro';` as the FIRST import in the entry point file (before React, ReactDOM, App, or anything else).

---

## Next.js — App Router

**Install:**

```
[package-manager] add @grafana/faro-web-sdk @grafana/faro-web-tracing
```

**Create `components/FrontendObservability.tsx`** (or `src/components/FrontendObservability.tsx` if the project uses `src/`):

```tsx
'use client';

import { faro, getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

export default function FrontendObservability() {
  if (typeof window === 'undefined' || faro.api) {
    return null;
  }

  try {
    initializeFaro({
      url: process.env.NEXT_PUBLIC_FARO_URL!,
      app: {
        name: process.env.NEXT_PUBLIC_FARO_APP_NAME || '<APP_NAME>',
        version: '1.0.0',
        environment: process.env.NODE_ENV,
      },
      instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
    });
  } catch (e) {
    // Silently fail — Faro should never break the app
  }

  return null;
}
```

**Wire:** Read `app/layout.tsx` (or `src/app/layout.tsx`). Add `import FrontendObservability from` with the correct relative path. Add `<FrontendObservability />` inside the `<body>` tag, BEFORE `{children}`.

**Create or append to `.env.local`:**

```
NEXT_PUBLIC_FARO_URL=<COLLECTOR_URL>
NEXT_PUBLIC_FARO_APP_NAME=<APP_NAME>
```

If `.env.local` already exists, append these lines. If `.env.local` is in `.gitignore`, also add the same keys (with placeholder values) to `.env.example` or `.env` if one exists.

---

## Next.js — Pages Router

**Install:**

```
[package-manager] add @grafana/faro-web-sdk @grafana/faro-web-tracing
```

**Create `src/faro.ts`** (or `faro.ts` at project root if no `src/`):

```ts
import { faro, getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

if (typeof window !== 'undefined' && !faro.api) {
  initializeFaro({
    url: process.env.NEXT_PUBLIC_FARO_URL!,
    app: {
      name: process.env.NEXT_PUBLIC_FARO_APP_NAME || '<APP_NAME>',
      version: '1.0.0',
      environment: process.env.NODE_ENV,
    },
    instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
  });
}
```

**Wire:** Add `import '../faro';` (adjust path) as the first import in `pages/_app.tsx`.

**Create or append to `.env.local`** (same as App Router above).

---

## Angular

**Install:**

```
[package-manager] add @grafana/faro-web-sdk @grafana/faro-web-tracing
```

**Create `src/app/faro-initializer.ts`:**

```ts
import { isDevMode } from '@angular/core';
import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

export function faroInitializer(): () => void {
  return () => {
    initializeFaro({
      url: '<COLLECTOR_URL>',
      app: {
        name: '<APP_NAME>',
        version: '<VERSION>', // read from package.json version field
        environment: isDevMode() ? 'development' : 'production',
      },
      instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
    });
  };
}
```

**Create `src/app/faro-error-handler.ts`:**

```ts
import { ErrorHandler, Injectable } from '@angular/core';
import { faro } from '@grafana/faro-web-sdk';

@Injectable()
export class FaroErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    faro.api?.pushError(err);
    console.error(error);
  }
}
```

**Wire in `src/app/app.module.ts`:** Add the following to the `providers` array:

```ts
import { APP_INITIALIZER, ErrorHandler } from '@angular/core';
import { faroInitializer } from './faro-initializer';
import { FaroErrorHandler } from './faro-error-handler';

// In @NgModule providers:
{ provide: APP_INITIALIZER, useFactory: faroInitializer, multi: true },
{ provide: ErrorHandler, useClass: FaroErrorHandler },
```

If the project uses standalone components (Angular 14+, no `app.module.ts`), wire in `src/main.ts` using `provideAppInitializer` instead.

---

## Vue

**Install:**

```
[package-manager] add @grafana/faro-web-sdk @grafana/faro-web-tracing
```

**Create `src/faro.ts`:**

```ts
import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

initializeFaro({
  url: '<COLLECTOR_URL>',
  app: {
    name: '<APP_NAME>',
    version: '<VERSION>', // read from package.json version field
    environment: import.meta.env.MODE,
  },
  instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
});
```

**Wire:** Add `import './faro';` as the FIRST import in `src/main.ts` (before Vue's `createApp`).

---

## Svelte

**Install and `src/faro.ts`:** Same as Vue above.

**Wire:** Add `import './faro';` as the FIRST import in `src/main.ts` or `src/main.js`.

---

## Vanilla JS (with build system)

**Install:**

```
[package-manager] add @grafana/faro-web-sdk @grafana/faro-web-tracing
```

**Create `src/faro.ts`** (or `.js` matching the project's language):

```ts
import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

initializeFaro({
  url: '<COLLECTOR_URL>',
  app: {
    name: '<APP_NAME>',
    version: '<VERSION>', // read from package.json version field
    environment: process.env.NODE_ENV ?? import.meta.env.MODE,
  },
  instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
});
```

**Wire:** Add `import './faro';` as the FIRST import in the entry file.

---

## Plain HTML (CDN, no build system)

**No packages to install.**

Insert the following into the `<head>` of the main HTML file, BEFORE any other `<script>` tags:

```html
<script>
  (function () {
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/@grafana/faro-web-sdk@2/dist/bundle/faro-web-sdk.iife.js';
    s.onload = function () {
      window.GrafanaFaroWebSdk.initializeFaro({
        url: '<COLLECTOR_URL>',
        app: { name: '<APP_NAME>', version: '1.0.0', environment: 'production' },
      });
      var t = document.createElement('script');
      t.src = 'https://unpkg.com/@grafana/faro-web-tracing@2/dist/bundle/faro-web-tracing.iife.js';
      t.onload = function () {
        window.GrafanaFaroWebSdk.faro.instrumentations.add(new window.GrafanaFaroWebTracing.TracingInstrumentation());
      };
      document.head.appendChild(t);
    };
    document.head.appendChild(s);
  })();
</script>
```
