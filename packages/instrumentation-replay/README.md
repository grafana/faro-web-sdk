# @grafana/faro-instrumentation-replay

Faro instrumentation for session replay with rrweb.

This is an optional package, released alongside the other Faro packages under the same
[semantic versioning policy](https://github.com/grafana/faro-web-sdk#releases).

## Installation

```bash
npm install @grafana/faro-instrumentation-replay
```

## Usage

```typescript
import { ReplayInstrumentation } from '@grafana/faro-instrumentation-replay';
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';

initializeFaro({
  url: 'https://your-faro-endpoint.com',
  app: { name: 'demo' },
  instrumentations: [...getWebInstrumentations(), new ReplayInstrumentation()],
});
```

Text content and text input values are masked by default. Checkbox and radio values and checked state
can still be recorded. Use `grafana-block` or `blockSelector` for sensitive form groups. Review the privacy
options below before making masking more selective.

Replay is a separate, opt-in package and is not included by `getWebInstrumentations()`. Its code is only
loaded when you import the package or load its browser bundle.

## Public API

The package exports `ReplayInstrumentation` and the types `ReplayInstrumentationOptions`, `MaskInputOptions`,
and `MaskInputFn`. Pass an instance to `initializeFaro()` as shown above. Use `pauseRecording()` and
`resumeRecording()` on that instance to control recording explicitly.

## Supported Environments and Limitations

Replay runs in browser pages, including the client-side portion of server-rendered applications. Initialize
Faro in the browser; server runtimes, browser extensions, workers, Node.js, and React Native are outside the
[supported environments](https://github.com/grafana/faro-web-sdk#supported-environments).

Canvas pixel capture is experimental and requires a player that supports raster
snapshots. Enable it with `new ReplayInstrumentation({ captureCanvasSnapshots: true })`.
The recorder samples up to four frames per second across eligible canvases
in the visible top-level document, using WebP quality 0.5. Canvas pixels can include map labels and other
sensitive content even when DOM text and input masking are enabled. Use
`grafana-block` or `blockSelector` on a canvas or its document ancestors to exclude it.
For slotted content, apply the block to the shadow host or the light-DOM subtree.

For example, to capture only MapLibre canvases, include
`canvas:not(.maplibregl-canvas)` in your existing `blockSelector`. A privacy
preset that blocks `canvas` continues to block every canvas. Canvas sampling skips
iframe and shadow-tree content, unreadable canvases, and images above 8192 pixels
on either edge, 16,777,216 total pixels, or 768 KiB of encoded WebP.

WebGL applications must preserve the drawing buffer to capture pixels reliably
after rendering. For MapLibre GL JS, set
`canvasContextAttributes: { preserveDrawingBuffer: true }` when constructing
the map. Preserving the buffer can increase rendering cost.

Cross-origin iframe recording is disabled by default and requires rrweb in each child iframe when enabled.

## Configuration Options

### Privacy & Masking Options

| Key                | Type                                                     | Default                 | Description                                                                                                                                                                  |
| ------------------ | -------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sanitizeMetaHref` | `boolean`                                                | `true`                  | Strip credentials, query string, and fragment from `window.location.href` in rrweb Meta events before sending. URLs may still appear in transport metadata and DOM snapshots |
| `maskAllInputs`    | `boolean`                                                | `true`                  | Mask supported input values; checkbox/radio values and checked state can still be recorded                                                                                   |
| `maskInputOptions` | `MaskInputOptions`                                       | `{ password: true }`    | Selectively mask specific input types (used only when `maskAllInputs` is `false`)                                                                                            |
| `maskInputFn`      | `(value: string, element: HTMLElement) => string`        | Fixed-length `'******'` | Customize mask input content recording logic. The default returns a fixed-length mask regardless of input length to prevent length leakage                                   |
| `maskTextSelector` | `string`                                                 | `'*'`                   | CSS selector for elements whose text content should be masked                                                                                                                |
| `maskTextFn`       | `(text: string, element: HTMLElement \| null) => string` | `undefined`             | Transform text matched by `maskTextSelector` or `grafana-mask`. When omitted, rrweb replaces non-whitespace characters with `*`                                              |
| `blockSelector`    | `string`                                                 | `undefined`             | CSS selector for elements that should be blocked from recording. Blocked elements are replaced with a placeholder of the same dimensions                                     |
| `ignoreSelector`   | `string`                                                 | `undefined`             | CSS selector for elements whose input events should be ignored                                                                                                               |

#### Built-in CSS classes

These classes work without configuration and remain active alongside custom selectors:

| Class            | Behavior                                                                       |
| ---------------- | ------------------------------------------------------------------------------ |
| `grafana-mask`   | Masks text in the element and its descendants, not input values or attributes. |
| `grafana-block`  | Excludes the subtree's content and replaces it with a layout placeholder.      |
| `grafana-ignore` | Suppresses input-change recording on the matching input, textarea, or select.  |

```html
<span class="grafana-mask">Jane Doe</span>
<div class="grafana-block">Sensitive content</div>
<input class="grafana-ignore" type="search" />
```

#### `maskInputOptions`

| Key              | Type      | Description           |
| ---------------- | --------- | --------------------- |
| `password`       | `boolean` | Password inputs       |
| `text`           | `boolean` | Text inputs           |
| `email`          | `boolean` | Email inputs          |
| `tel`            | `boolean` | Telephone inputs      |
| `number`         | `boolean` | Number inputs         |
| `search`         | `boolean` | Search inputs         |
| `url`            | `boolean` | URL inputs            |
| `date`           | `boolean` | Date inputs           |
| `datetime-local` | `boolean` | Datetime-local inputs |
| `month`          | `boolean` | Month inputs          |
| `week`           | `boolean` | Week inputs           |
| `time`           | `boolean` | Time inputs           |
| `color`          | `boolean` | Color inputs          |
| `range`          | `boolean` | Range inputs          |
| `textarea`       | `boolean` | Textarea elements     |
| `select`         | `boolean` | Select dropdowns      |

### Recording Options

| Key                        | Type                           | Default  | Description                                                                                                                                     |
| -------------------------- | ------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `samplingRate`             | `number`                       | `1`      | Fraction of globally-sampled sessions that will be recorded. Applied on top of `sessionTracking.samplingRate`. Out-of-range values are clamped. |
| `recordAfter`              | `'load' \| 'DOMContentLoaded'` | `'load'` | When to start recording if the document is not ready yet                                                                                        |
| `recordCrossOriginIframes` | `boolean`                      | `false`  | Whether to record cross-origin iframes. rrweb must be injected in each child iframe for this to work                                            |
| `captureCanvasSnapshots`   | `boolean`                      | `false`  | Capture unmasked canvas pixels as image snapshots                                                                                               |
| `collectFonts`             | `boolean`                      | `false`  | Whether to collect fonts used in the website                                                                                                    |
| `inlineImages`             | `boolean`                      | `false`  | Whether to record image content                                                                                                                 |
| `inlineStylesheet`         | `boolean`                      | `false`  | Whether to inline stylesheets in the recording events                                                                                           |
| `inactivityThresholdMs`    | `number`                       | `60000`  | Pause recording after this many milliseconds of inactivity; resumes automatically on the next interaction. Set to `0` to disable                |

Once initialized, a `ReplayInstrumentation` instance can also be controlled
explicitly with `pauseRecording()` and `resumeRecording()`. Resuming starts a
new rrweb recording with a fresh DOM checkpoint. An explicitly paused recording
stays paused until `resumeRecording()` is called.

#### Sub-sampling example

```typescript
initializeFaro({
  url: 'https://your-faro-endpoint.com',
  app: { name: 'demo' },
  sessionTracking: {
    samplingRate: 1.0, // collect telemetry (logs, errors, web-vitals) for all sessions
  },
  instrumentations: [
    ...getWebInstrumentations(),
    new ReplayInstrumentation({
      samplingRate: 0.1, // record replay for only 10% of sessions
    }),
  ],
});
// Effective replay coverage: 1.0 × 0.1 = 10% of globally-sampled sessions
```

### Hooks

| Key          | Type                                                           | Default     | Description                                                                                   |
| ------------ | -------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| `beforeSend` | `(event: eventWithTime) => eventWithTime \| null \| undefined` | `undefined` | Transform or filter events before they are sent. Return `null` or `undefined` to skip sending |

## Privacy and Security

This instrumentation records user interactions on your website. Make sure to:

1. **Review masking options for your use case** - Text content and text input values are masked by default.
   Checkbox and radio values and checked state can still be recorded. You can make masking more selective
   with `maskAllInputs`, `maskInputOptions`, and `maskTextSelector`
2. **Block sensitive form groups** - Use `grafana-block` or `blockSelector` to completely exclude sensitive
   form groups and other elements. Use `maskTextSelector` to mask text content
3. **Implement filtering** - Use the `beforeSend` hook to filter or transform events before sending
4. **Review your privacy policy** - Ensure you have proper user consent for session recording
5. **Test your configuration** - Verify no sensitive information is captured in recordings

### Example: Advanced Privacy Configuration

```typescript
new ReplayInstrumentation({
  // Disable global input masking and use selective masking rules instead
  maskAllInputs: false,
  // Mask all text and email inputs, but allow number inputs
  maskInputOptions: {
    password: true,
    text: true,
    email: true,
    tel: true,
    textarea: true,
  },
  // Mask elements with specific CSS classes
  maskTextSelector: '.sensitive-data, .pii',
  // Block elements completely from recording
  blockSelector: '.payment-form, .credit-card-info',
  // Ignore input-change events on matching elements
  ignoreSelector: '.analytics-widget',
});
```
