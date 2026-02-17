# @grafana/faro-chrome-extension

> **Warning**: this package is experimental and may be subject to frequent and breaking changes. Use at your own risk.

Faro package for instrumenting Chrome extensions. It provides instrumentations, metas, and transports that work across
all Chrome extension contexts: background service workers, content scripts, and popup/options pages.

## Installation

```bash
npm install @grafana/faro-chrome-extension
# or
yarn add @grafana/faro-chrome-extension
```

## Why a separate package?

Chrome extensions have three execution contexts with different API availability:

| Context | `window` | `document` | `chrome.*` APIs | `localStorage` |
| --- | --- | --- | --- | --- |
| **Background service worker** | No | No | Yes | No |
| **Content script** | Yes (page's) | Yes (page's) | Partial | Yes (page's) |
| **Popup / options page** | Yes (own) | Yes (own) | Yes | Yes (own) |

The standard `@grafana/faro-web-sdk` assumes a browser page context (`window`, `document`, DOM APIs) and will fail in
a background service worker. This package replaces the browser-specific instrumentations with equivalents that work in
all three contexts.

## Quick start

```ts
import { initializeFaroForExtension } from '@grafana/faro-chrome-extension';

const faro = initializeFaroForExtension({
  url: 'https://collector.example.com/collect',
  app: {
    name: 'my-extension',
    version: '1.0.0',
  },
});
```

The SDK auto-detects which extension context it is running in. You can also specify it explicitly:

```ts
const faro = initializeFaroForExtension({
  url: 'https://collector.example.com/collect',
  app: {
    name: 'my-extension',
    version: '1.0.0',
  },
  extensionContext: 'background', // 'background' | 'content-script' | 'popup'
});
```

## Context auto-detection

When `extensionContext` is not specified, the SDK detects it automatically:

| Condition | Detected context |
| --- | --- |
| `typeof window === 'undefined'` | `background` |
| `chrome.runtime` exists and `document.location.protocol === 'chrome-extension:'` | `popup` |
| Otherwise | `content-script` |

## Instrumentations

The instrumentations included depend on the detected (or specified) context:

### All contexts (background, content-script, popup)

- **ExtensionErrorsInstrumentation** - captures unhandled errors and unhandled promise rejections using
  `self.addEventListener('error')` and `self.addEventListener('unhandledrejection')`, which work in service workers
  unlike `window.onerror`.
- **ConsoleInstrumentation** - captures messages logged to the `console` global object (re-exported from
  `@grafana/faro-web-sdk`). `console` is available in all extension contexts.
- **ExtensionSessionInstrumentation** - manages session state using `chrome.storage.local` instead of
  `localStorage`/`sessionStorage`. This works in all extension contexts (including service workers) and persists
  across service worker restarts.

### Content scripts and popups only

In addition to the above, content scripts and popup pages have DOM access, so the following instrumentations from
`@grafana/faro-web-sdk` are also included:

- **WebVitalsInstrumentation** - captures Core Web Vitals performance metrics
- **PerformanceInstrumentation** - captures performance entries from the Performance API
- **ViewInstrumentation** - sends view changed events

## Metas

- **extensionMeta** - collects extension-specific metadata from `chrome.runtime.getManifest()` (extension name,
  version) and the runtime environment
- **sdkMeta** - identifies the SDK as `faro-chrome-extension` with the current version

## Extension manifest permissions

Your extension's `manifest.json` must include the `storage` permission for session persistence:

```json
{
  "permissions": ["storage"]
}
```

If you are sending telemetry to an external collector, you may also need the host permission:

```json
{
  "host_permissions": ["https://collector.example.com/*"]
}
```

## Usage examples

### Background service worker

```ts
// background.ts
import { initializeFaroForExtension } from '@grafana/faro-chrome-extension';

const faro = initializeFaroForExtension({
  url: 'https://collector.example.com/collect',
  app: {
    name: 'my-extension',
    version: '1.0.0',
  },
});

chrome.runtime.onInstalled.addListener(() => {
  faro.api.pushEvent('extension-installed');
});

chrome.action.onClicked.addListener(() => {
  faro.api.pushLog(['Action button clicked']);
});
```

### Content script

```ts
// content.ts
import { initializeFaroForExtension } from '@grafana/faro-chrome-extension';

const faro = initializeFaroForExtension({
  url: 'https://collector.example.com/collect',
  app: {
    name: 'my-extension-content',
    version: '1.0.0',
  },
});

// DOM interactions are available in content scripts
document.addEventListener('click', (event) => {
  faro.api.pushEvent('content-click', {
    target: (event.target as HTMLElement).tagName,
  });
});
```

### Popup page

```ts
// popup.ts
import { initializeFaroForExtension } from '@grafana/faro-chrome-extension';

const faro = initializeFaroForExtension({
  url: 'https://collector.example.com/collect',
  app: {
    name: 'my-extension-popup',
    version: '1.0.0',
  },
});

faro.api.pushEvent('popup-opened');
```

### Custom instrumentations

You can provide your own set of instrumentations instead of the defaults:

```ts
import {
  initializeFaroForExtension,
  ExtensionErrorsInstrumentation,
  ConsoleInstrumentation,
} from '@grafana/faro-chrome-extension';

const faro = initializeFaroForExtension({
  url: 'https://collector.example.com/collect',
  app: {
    name: 'my-extension',
    version: '1.0.0',
  },
  instrumentations: [
    new ExtensionErrorsInstrumentation(),
    new ConsoleInstrumentation(),
    // add your own instrumentations here
  ],
});
```

## Configuration

`ChromeExtensionConfig` extends the core Faro `Config` and adds:

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `url` | Collector endpoint URL | `string` | - |
| `apiKey` | Optional API key for the collector | `string` | - |
| `extensionContext` | The extension context to configure for | `'background' \| 'content-script' \| 'popup'` | Auto-detected |

All other [core configuration options][faro-core-readme] are supported as well (e.g., `instrumentations`, `metas`,
`transports`, `sessionTracking`, `dedupe`, `paused`, etc.).

## API

The Faro instance returned by `initializeFaroForExtension` provides the same API as the core SDK. See the
[@grafana/faro-core documentation][faro-core-readme] for full API reference.

```ts
// Push a log
faro.api.pushLog(['Something happened']);

// Push an error
faro.api.pushError(new Error('Something went wrong'));

// Push an event
faro.api.pushEvent('button-clicked', { buttonId: 'save' });

// Push a measurement
faro.api.pushMeasurement({
  type: 'custom',
  values: { loadTime: 123 },
});

// Set user metadata
faro.api.setUser({ id: 'user-123', username: 'jane' });
```

## Demo

A working Chrome extension demo is available at [`demo/chrome-extension/`](../../demo/chrome-extension/). It initializes
Faro in all three contexts and logs telemetry to the browser console. See its
[README](../../demo/chrome-extension/README.md) for build and usage instructions.

[faro-core-readme]: https://github.com/grafana/faro-web-sdk/blob/main/packages/core/README.md
