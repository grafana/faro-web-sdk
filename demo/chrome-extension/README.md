# Chrome Extension Demo

A minimal Chrome extension that demonstrates [`@grafana/faro-chrome-extension`](../../experimental/chrome-extension/README.md) in all three extension contexts: background service worker, content script, and popup page.

Telemetry is logged to the browser console via `ConsoleTransport` by default, so no collector is required.

## Prerequisites

- [Node.js](https://nodejs.org/) (see `.nvmrc` at the repo root)
- [Yarn](https://yarnpkg.com/)
- A Chromium-based browser (Chrome, Edge, Brave, etc.)

## Build

From the repository root:

```bash
# Install dependencies (includes workspace linking)
yarn install

# Build the chrome-extension package
yarn workspace @grafana/faro-chrome-extension build

# Build the demo
yarn workspace @grafana/faro-chrome-extension-demo build
```

The build produces three IIFE bundles in `demo/chrome-extension/dist/`:

| File | Extension context |
| --- | --- |
| `background.js` | Background service worker |
| `content.js` | Content script (injected into every page) |
| `popup.js` | Popup page |

## Load in Chrome

1. Open `chrome://extensions` in your browser.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the `demo/chrome-extension/` directory.
4. The extension icon appears in the toolbar.

## Verify

### Background service worker

1. On the `chrome://extensions` page, find "Faro Chrome Extension Demo".
2. Click the **Inspect views: service worker** link.
3. In the DevTools console you should see Faro initialization logs and an `extension-installed` event.

### Content script

1. Navigate to any web page.
2. Open DevTools on that page (F12).
3. In the console, look for a log entry: `Content script loaded on <url>`.
4. Click anywhere on the page — you should see `page-click` events logged with the element tag and id.

### Popup

1. Click the extension icon in the toolbar to open the popup.
2. The popup displays the current Faro session ID.
3. Right-click the popup and choose **Inspect** to open its DevTools.
4. Click the three buttons and observe the corresponding telemetry in the console:
   - **Push Log** — pushes `Hello from popup`
   - **Push Error** — pushes a test `Error`
   - **Push Event** — pushes a `button-clicked` event

## Sending to a real collector

To send telemetry to a collector instead of the console, edit each source file in `src/` and replace the `transports` option with a `url`:

```ts
initializeFaroForExtension({
  app: { name: 'faro-chrome-extension-demo', version: '1.0.0' },
  url: 'http://localhost:12345/collect',
  // ...
});
```

Then rebuild with `yarn workspace @grafana/faro-chrome-extension-demo build` and reload the extension.

## Project structure

```
demo/chrome-extension/
├── manifest.json          # MV3 extension manifest
├── package.json           # Workspace package (private)
├── tsconfig.json          # TypeScript configuration
├── rollup.config.js       # Bundles each entry point into dist/
├── popup.html             # Popup UI
├── popup.css              # Popup styles
├── src/
│   ├── background.ts      # Service worker — Faro init + chrome event listeners
│   ├── content.ts         # Content script — Faro init + page click tracking
│   └── popup.ts           # Popup — Faro init + buttons for pushing telemetry
└── dist/                  # Build output (gitignored)
```
