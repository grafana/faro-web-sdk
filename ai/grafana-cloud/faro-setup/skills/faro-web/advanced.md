# Advanced implementation reference

Implementation code for options offered in the Step 3 setup menu of the `faro-web` skill. The user reaches these through the Step 3 menu — not through a separate step.

The user can also trigger any section at any time by asking for it by name (e.g. "add error boundary", "set up cookie consent").

---

## A. Cross-origin tracing

Tracing is already enabled in the base setup. Same-origin API requests are automatically traced. This option is only needed for **cross-origin** requests (different domain or port).

Ask:

> Do you make API requests to a different domain than your app? (e.g., `https://api.example.com` while your app is on `https://example.com`)
>
> If yes, paste the base URL(s) so trace headers get attached to those requests too.

If URLs are provided, add `propagateTraceHeaderCorsUrls` to the `TracingInstrumentation`:

```ts
new TracingInstrumentation({
  propagateTraceHeaderCorsUrls: [
    /https:\/\/api\.example\.com/,
  ],
}),
```

Convert each URL into a regex pattern.

---

## B. Navigation & route tracking

Faro has two complementary approaches for tracking SPA navigations. Present both and let the user choose:

> **How should Faro track page navigations?**
>
> 1. **Auto-navigation tracking** (recommended start) — Faro automatically detects URL changes and DOM updates after user interactions. Works with any router, zero wiring. Captures `fromUrl`, `toUrl`, and navigation duration. Does NOT capture route patterns (e.g., you see `/users/123` not `/users/:id`).
> 2. **Router integration** — hooks directly into your router for precise route patterns and view grouping. More setup, but all signals (errors, logs, events) get tagged with the current view name. Best for apps with parameterized routes.
> 3. **Both** — auto-navigation for timing data + router integration for route patterns and view grouping.

### B1. Auto-navigation tracking (any framework)

Add `experimental.trackNavigation` to the Faro config:

```ts
initializeFaro({
  // ... existing config ...
  experimental: {
    trackNavigation: true,
  },
});
```

This is already included in `getWebInstrumentations()` but filtered out by default. The flag enables it. No other code changes needed.

**What it captures:** `faro.navigation` events with `fromUrl`, `toUrl`, `sameDocument: "true"`, and `duration`. Uses the Navigation API in modern browsers, falls back to History API patching (`pushState`, `replaceState`, `popstate`).

### B2. Router integration

Generate the appropriate code based on the detected framework.

---

#### React Router

Only available when `react-router-dom` or `react-router` is detected. Determine router version from Step 0c.

**React Router v6/v7 with data router** (uses `createBrowserRouter`):

Update `src/faro.ts`:

```ts
import {
  initializeFaro,
  getWebInstrumentations,
  ReactIntegration,
  createReactRouterV6DataOptions,
} from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import { matchRoutes } from 'react-router-dom';

initializeFaro({
  url: '<COLLECTOR_URL>',
  app: { name: '<APP_NAME>' },
  instrumentations: [
    ...getWebInstrumentations(),
    new TracingInstrumentation(),
    new ReactIntegration({
      router: createReactRouterV6DataOptions({
        matchRoutes,
      }),
    }),
  ],
});
```

For v7 data router, use `createReactRouterV7DataOptions` instead (same API).

Then find where `createBrowserRouter` is called and wrap it:

```ts
import { withFaroRouterInstrumentation } from '@grafana/faro-react';

const router = withFaroRouterInstrumentation(createBrowserRouter([...]));
```

**React Router v6/v7 without data router:**

Update `src/faro.ts`:

```ts
import {
  initializeFaro,
  getWebInstrumentations,
  ReactIntegration,
  createReactRouterV6Options,
} from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import { createRoutesFromChildren, matchRoutes, Routes, useLocation, useNavigationType } from 'react-router-dom';

initializeFaro({
  url: '<COLLECTOR_URL>',
  app: { name: '<APP_NAME>' },
  instrumentations: [
    ...getWebInstrumentations(),
    new TracingInstrumentation(),
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

For v7, use `createReactRouterV7Options` instead (same API).

**React Router v5:**

First check whether the `history` package is in `package.json`. If not, install it — React Router v5 uses it internally but does not re-export it:

```
[package-manager] add history
```

```ts
import {
  initializeFaro,
  getWebInstrumentations,
  ReactIntegration,
  createReactRouterV5Options,
} from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import { createBrowserHistory } from 'history';

const history = createBrowserHistory();

initializeFaro({
  url: '<COLLECTOR_URL>',
  app: { name: '<APP_NAME>' },
  instrumentations: [
    ...getWebInstrumentations(),
    new TracingInstrumentation(),
    new ReactIntegration({
      router: createReactRouterV5Options({ history }),
    }),
  ],
});
```

The `history` instance must be the SAME one passed to `<Router history={history}>`. If the project already creates a history instance, import and reuse it instead of creating a new one.

**React Router v4:**

Same API as v5. Use `createReactRouterV4Options` (alias for the same implementation).

**What React Router integration captures:** `route_change` events with `toRoute` (the pattern, e.g. `/users/:id`), `toUrl` (the actual URL), `fromRoute`, `fromUrl`. Only fires on PUSH and POP navigations (not REPLACE).

---

#### Next.js

Next.js does not have an official Faro router integration. Use `setView()` via the `usePathname` hook.

**App Router** — create a client component to track navigation:

Create `components/FaroRouteTracker.tsx` (or `src/components/FaroRouteTracker.tsx` if project uses `src/`). Place it in the same directory as `FrontendObservability.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { faro } from '@grafana/faro-web-sdk';

export default function FaroRouteTracker() {
  const pathname = usePathname();
  const previousPathname = useRef<string>();

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      faro.api?.setView({ name: pathname });
      previousPathname.current = pathname;
    }
  }, [pathname]);

  return null;
}
```

Wire: add `<FaroRouteTracker />` in `app/layout.tsx` AFTER `<FrontendObservability />` (Faro must be initialized first for `faro.api` to be available).

**Pages Router** — add to `_app.tsx`:

```tsx
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { faro } from '@grafana/faro-web-sdk';

// Inside the App component:
const router = useRouter();

useEffect(() => {
  function handleRouteChange(url: string) {
    faro.api?.setView({ name: url });
  }
  router.events.on('routeChangeComplete', handleRouteChange);
  return () => router.events.off('routeChangeComplete', handleRouteChange);
}, [router.events]);
```

---

#### Angular

Wire into the Angular Router's `NavigationEnd` events.

Create `src/app/faro-route-tracker.service.ts`:

```ts
import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { faro } from '@grafana/faro-web-sdk';

@Injectable({ providedIn: 'root' })
export class FaroRouteTracker {
  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        faro.api?.setView({ name: event.urlAfterRedirects });
      });
  }
}
```

Wire: inject the service in `AppComponent` (or `app.component.ts`) so it initializes on startup:

```ts
import { FaroRouteTracker } from './faro-route-tracker.service';

export class AppComponent {
  constructor(private _faroRouteTracker: FaroRouteTracker) {}
}
```

For standalone components (Angular 14+), inject in the root component or use `provideAppInitializer`.

---

#### Vue

Wire into Vue Router's `afterEach` guard.

Add to the file where the router is created (typically `src/router/index.ts` or `src/router.ts`):

```ts
import { faro } from '@grafana/faro-web-sdk';

router.afterEach((to) => {
  const routeName = to.matched[0]?.path ?? to.path;
  faro.api?.setView({ name: routeName });
});
```

`to.matched[0]?.path` gives the route pattern (e.g. `/users/:id`). Falls back to `to.path` (the actual URL) if no match.

---

#### Svelte / SvelteKit

Wire into SvelteKit's `afterNavigate` lifecycle.

Create `src/lib/faro-route-tracker.ts`:

```ts
import { afterNavigate } from '$app/navigation';
import { faro } from '@grafana/faro-web-sdk';

export function initFaroRouteTracking() {
  afterNavigate(({ to }) => {
    const routeName = to?.route?.id ?? to?.url?.pathname ?? '';
    faro.api?.setView({ name: routeName });
  });
}
```

Wire: call `initFaroRouteTracking()` in the root `+layout.svelte`:

```svelte
<script>
  import { initFaroRouteTracking } from '$lib/faro-route-tracker';
  import { onMount } from 'svelte';

  onMount(() => {
    initFaroRouteTracking();
  });
</script>
```

`to.route.id` gives the route pattern (e.g. `/users/[id]`). Falls back to the actual pathname.

For plain Svelte (no SvelteKit), there is no built-in router. If the project uses `svelte-routing` or `svelte-navigator`, ask the user where route changes happen and wire `faro.api.setView()` there.

---

**What `setView()` does for non-React frameworks:** All subsequent Faro signals (errors, logs, events, measurements) are tagged with the current view name. This lets you filter and group data by page/view in Grafana. The `ViewInstrumentation` (included in `getWebInstrumentations()`) automatically emits `view_changed` events when the view changes.

---

## C. React Error Boundary

Only available for React projects.

Wrap the root component in the entry point:

```tsx
import { FaroErrorBoundary } from '@grafana/faro-react';

// Wrap <App /> (or the outermost component inside the router):
<FaroErrorBoundary>
  <App />
</FaroErrorBoundary>;
```

Ask:

> Do you want a custom fallback UI when a component crashes? (default: renders nothing)

If yes, add a fallback:

```tsx
<FaroErrorBoundary fallback={(error) => <div>Something went wrong: {error.message}</div>}>
  <App />
</FaroErrorBoundary>
```

---

## D. Ignore additional errors

The universal browser noise patterns were auto-applied in Step 3-1. This option is for app-specific errors the user wants to suppress on top of those.

Ask:

> Are there specific error messages from your app you want to exclude? Paste substrings or regex patterns — I'll add them alongside the defaults.

**Matching rules:**

- Strings use substring matching against `error.message + ' ' + error.name + ' ' + error.stack`
- Regular expressions use regex match against the same concatenated string

Append the new patterns to the existing `ignoreErrors` array (don't replace it).

---

## E. Ignore additional URLs

Known 3rd party services are handled automatically in Step 2. This option is for any additional domains the user wants to add manually.

Ask:

> Any other domains you want to exclude from network tracking? Paste URLs or domain names.

Convert each entry to a regex pattern (e.g., `analytics.mycompany.com` → `/analytics\.mycompany\.com/`) and append to the existing `ignoreUrls` array.

---

## F. Session configuration (advanced)

Ask:

> Do you want to customize any of these session settings?
>
> 1. **Persistent sessions** — continue the same session across tab closes and browser restarts (uses `localStorage`).
> 2. **Inactivity timeout** — how long a gap between events ends the session (default: 15 minutes). Increase for apps with long idle periods (e.g. reading-heavy content).
> 3. **Session change callback** — run code whenever a session starts or renews (useful for syncing with your own analytics or logging).
> 4. **None** — keep defaults.

Generate only the options the user selects, merged into the existing `sessionTracking` block:

**Persistent sessions:**

```ts
sessionTracking: {
  persistent: true,
},
```

Note: uses `localStorage`. If the browser blocks third-party `localStorage` (Firefox strict mode, Safari ITP), cross-origin iframes will fall back to non-persistent session storage — this is expected behavior.

**Custom inactivity timeout** (e.g., 30 minutes):

```ts
sessionTracking: {
  maxSessionPersistenceTime: 30 * 60 * 1000, // 30 minutes in ms
},
```

**Session change callback:**

```ts
sessionTracking: {
  onSessionChange: (oldSession, newSession) => {
    // Called when a new session starts or an existing session is renewed.
    // oldSession is null on the very first session of the page load.
    // NOTE: do NOT use console.log here — Faro captures console calls by default,
    // which would create a feedback loop (log → Faro event → log → ...).
    // Use a side-effect that doesn't go through the console, e.g.:
    // myAnalytics.track('session_started', { sessionId: newSession.id });
  },
},
```

---

## G. Cookie consent / tracking gate

For apps that must comply with GDPR, PECR, or similar regulations, tracking should not start until the user accepts a consent banner. Faro supports this via `paused: true` at init time.

Ask:

> Does your app show a cookie consent banner before tracking users? If yes, I'll set up Faro in paused mode so it doesn't send any data until consent is given.

If yes, update `initializeFaro` to start paused:

```ts
initializeFaro({
  // ... existing config ...
  paused: true,
});
```

Then call `faro.unpause()` once the user accepts consent. The exact location depends on the consent library:

```ts
import { faro } from '@grafana/faro-web-sdk'; // or '@grafana/faro-react'

// Call this inside your consent acceptance handler:
faro.unpause();
```

Common integration points by library:

- **Cookiebot**: `window.addEventListener('CookiebotOnAccept', () => faro.unpause())`
- **OneTrust**: in the `OptanonWrapper` callback after checking category consents
- **Osano**: `osano.cm.addEventListener('osano-cm-consent-saved', () => faro.unpause())`
- **Custom banner**: wherever you set the consent cookie or call your own acceptance handler

Note: signals generated while Faro is paused are discarded, not queued. If you need to capture the initial page load even before consent, consult your legal team about legitimate interest grounds.

---

## H. Content Security Policy violations

`SecurityPolicyInstrumentation` captures browser CSP violation events and sends them to Grafana as errors. It is **enabled by default** inside `getWebInstrumentations()`.

Explain to the user:

> CSP violation tracking is already active in your setup. Whenever the browser blocks a resource due to your Content-Security-Policy headers, Faro captures the violation — including which directive was violated, what was blocked, and where.
>
> Do you want to:
> A. **Keep it on** (recommended) — no changes needed
> B. **Disable it** — removes CSP tracking from the setup

If **A** — no code changes. Confirm it's active.

If **B** — update the `getWebInstrumentations()` call to disable it:

```ts
initializeFaro({
  // ... existing config ...
  instrumentations: [
    ...getWebInstrumentations({
      enableContentSecurityPolicyInstrumentation: false,
    }),
    new TracingInstrumentation(),
  ],
});
```

---

## I. iFrame / embedded app

**Case 1: This app embeds other pages in `<iframe>` tags**

Each iframe runs in its own JavaScript context. If the embedded apps also use Faro, they initialize their own instances and report under their own `app.name` — this is correct and expected. Faro in the parent page does not track iframe network activity. No code changes are needed in the parent.

**Case 2: This app runs inside an `<iframe>`**

Faro works inside an iframe with no code changes. Key points:

- **URL**: Faro reports the iframe's own URL. Sessions from this iframe appear under its origin in Grafana.
- **Web Vitals**: LCP and CLS are measured relative to the iframe's viewport — expected behavior.
- **Session storage**: `sessionStorage` is isolated per-origin. Same-origin iframes share storage with the parent; cross-origin iframes have their own isolated storage. Both work correctly with Faro defaults.
- **Cross-origin iframes and persistent sessions**: If the browser blocks third-party `localStorage` (Firefox in strict mode, Safari ITP), `sessionTracking: { persistent: true }` will not carry sessions across tab closes for cross-origin iframes. Default `sessionStorage` is not affected.

**Correlating iframe data with the parent page**

If you want events in this iframe associated with the parent page's session, pass a correlation ID from the parent via `postMessage`:

```ts
// In the iframe — receive correlation ID from parent:
window.addEventListener('message', (event) => {
  if (event.data?.type === 'faro-session-id') {
    faro.api?.setSession({ attributes: { parentSessionId: event.data.sessionId } });
  }
});

// In the parent — send Faro session ID to iframe:
import { faro } from '@grafana/faro-web-sdk';
const iframe = document.querySelector('iframe');
iframe.contentWindow?.postMessage(
  {
    type: 'faro-session-id',
    sessionId: faro.api?.getSession()?.id,
  },
  '*'
);
```

---

## J. Microfrontend coordination

Faro uses a module-level singleton. Calling `initializeFaro()` twice in the same browser window overwrites the first instance — the first session and its queued events are lost. Only one app in a shared window should call `initializeFaro()`.

**Step 1: Identify your app's role**

Ask the user:

> Is this app a host/shell that loads other microfrontends, or a child microfrontend that runs inside a shell?
>
> A. **Host / shell app** — I initialize Faro here; child apps will share it
> B. **Child microfrontend** — a shell app already has Faro; I should NOT call `initializeFaro()` here

**If A (host app):** Current setup is correct. Add the Module Federation shared config below if applicable.

**If B (child microfrontend):** Do NOT call `initializeFaro()` in this app. Remove any existing Faro init code and replace with direct `faro.api` calls:

```ts
// In a child microfrontend — import faro, do NOT call initializeFaro()
import { faro } from '@grafana/faro-web-sdk';

// Use faro.api directly (the host has already initialized it):
faro.api?.pushEvent('checkout_started', { cartSize: '3' });
faro.api?.pushError(new Error('Payment failed'));
faro.api?.setUser({ id: userId, email: user.email });
```

`faro.api` is `undefined` until the host calls `initializeFaro()`. Always use optional chaining (`?.`) in child apps. Add `@grafana/faro-web-sdk` to the child's `package.json` as a dev dependency (for TypeScript types) and rely on the host for the runtime instance.

**Module Federation: share the SDK as a singleton**

If using Webpack Module Federation, configure `singleton: true` so all apps share one SDK instance:

```js
// webpack.config.js (host app — add eager: true here only)
new ModuleFederationPlugin({
  shared: {
    '@grafana/faro-web-sdk': { singleton: true, eager: true, requiredVersion: '^2.0.0' },
    '@grafana/faro-react': { singleton: true, eager: true, requiredVersion: '^2.0.0' },
    '@grafana/faro-web-tracing': { singleton: true, eager: true, requiredVersion: '^2.0.0' },
  },
});

// webpack.config.js (each child app — no eager)
new ModuleFederationPlugin({
  shared: {
    '@grafana/faro-web-sdk': { singleton: true, requiredVersion: '^2.0.0' },
    '@grafana/faro-react': { singleton: true, requiredVersion: '^2.0.0' },
    '@grafana/faro-web-tracing': { singleton: true, requiredVersion: '^2.0.0' },
  },
});
```

Without `singleton: true`, each child may bundle its own copy of the SDK and get a separate uninitialized `faro` reference, causing `faro.api` to be `undefined` in child apps even after the host initializes it.

**Independent reporting (separate browser contexts only)**

If each microfrontend loads in its own browser context (separate tabs, separate full-page navigations, or separate cross-origin iframes), each CAN call `initializeFaro()` with a distinct `app.name`. Use names that identify the app:

- Shell: `app.name: 'my-app-shell'`
- Checkout: `app.name: 'my-app-checkout'`

This does NOT work if the apps share the same window — two `initializeFaro()` calls in the same window will conflict.

---

## K. User identity

Tag errors, logs, and sessions with the logged-in user. Ask:

> Where in your app does the user become available — on page load (from a cookie/token), or after a login callback?

Do NOT add a new import line. Instead, add `faro` to the existing Faro import in `src/faro.ts` (or whichever init file was created in Step 2):

```ts
// Modify the existing import — add `faro` to it:
import { faro, initializeFaro, getWebInstrumentations } from '@grafana/faro-react';
// (or from '@grafana/faro-web-sdk' for non-React projects)
```

Then generate `setUser` at the right location:

```ts
// Call this once the user is known (e.g., after auth check, after login):
faro.api?.setUser({
  id: 'user-123', // required; must be stable across sessions
  username: 'jane_doe', // optional
  email: 'jane@example.com', // optional; PII — check your data retention policy
  attributes: {
    // optional; any extra key-value data
    plan: 'pro',
    tenant: 'acme',
  },
});

// On logout — clears the user from all subsequent signals:
faro.api?.resetUser();
```

`faro.api?.setUser()` is safe to call multiple times — each call replaces the current user context. Subsequent signals (errors, logs, events) carry the user fields until `resetUser()` is called.

---

## L. Disable console log capture

Faro captures `console.log`, `console.warn`, and `console.error` by default. To opt out:

```ts
initializeFaro({
  // ... existing config ...
  instrumentations: [
    ...getWebInstrumentations({
      captureConsole: false,
    }),
    new TracingInstrumentation(),
  ],
});
```

Note: disabling console capture means Faro logs won't appear in Grafana. Errors and web vitals are unaffected — those come from separate instrumentations.

---

## M. Disable distributed tracing

`TracingInstrumentation` adds W3C `traceparent` headers to all same-origin fetch/XHR requests. To remove it:

Update the instrumentations array (remove `TracingInstrumentation`):

```ts
import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk';

initializeFaro({
  // ... existing config ...
  instrumentations: [
    ...getWebInstrumentations(),
    // TracingInstrumentation removed
  ],
});
```

Also remove the import line for `TracingInstrumentation` and uninstall the package if it was added only for tracing:

```
[package-manager] remove @grafana/faro-web-tracing
```
