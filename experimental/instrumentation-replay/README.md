# @grafana/faro-instrumentation-replay

Faro instrumentation for session replay with rrweb.

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
  instrumentations: [
    ...getWebInstrumentations(),
    new ReplayInstrumentation({
      maskInputOptions: {
        password: true,
        email: true,
      },
      maskAllInputs: false,
      recordAfter: 'load',
      recordCrossOriginIframes: false,
    }),
  ],
});
```

## Configuration Options

### Privacy & Masking Options

| Key                | Type                                              | Default                 | Description                                                                                                                                                                  |
| ------------------ | ------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sanitizeMetaHref` | `boolean`                                         | `true`                  | Strip credentials, query string, and fragment from `window.location.href` in rrweb Meta events before sending. URLs may still appear in transport metadata and DOM snapshots |
| `maskAllInputs`    | `boolean`                                         | `true`                  | Mask all input content                                                                                                                                                       |
| `maskInputOptions` | `MaskInputOptions`                                | `{ password: true }`    | Selectively mask specific input types (used only when `maskAllInputs` is `false`)                                                                                            |
| `maskInputFn`      | `(value: string, element: HTMLElement) => string` | Fixed-length `'******'` | Customize mask input content recording logic. The default returns a fixed-length mask regardless of input length to prevent length leakage                                   |
| `maskTextSelector` | `string`                                          | `'*'`                   | CSS selector for elements whose text content should be masked                                                                                                                |
| `blockSelector`    | `string`                                          | `undefined`             | CSS selector for elements that should be blocked from recording. Blocked elements are replaced with a placeholder of the same dimensions                                     |
| `ignoreSelector`   | `string`                                          | `undefined`             | CSS selector for elements whose input events should be ignored                                                                                                               |

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
| `recordCanvas`             | `boolean`                      | `false`  | Whether to record canvas element content                                                                                                        |
| `collectFonts`             | `boolean`                      | `false`  | Whether to collect fonts used in the website                                                                                                    |
| `inlineImages`             | `boolean`                      | `false`  | Whether to record image content                                                                                                                 |
| `inlineStylesheet`         | `boolean`                      | `false`  | Whether to inline stylesheets in the recording events                                                                                           |
| `inactivityThresholdMs`    | `number`                       | `60000`  | Pause recording after this many milliseconds of inactivity; resumes automatically on the next interaction. Set to `0` to disable                |

#### Sub-sampling example

```typescript
initializeFaro({
  url: 'https://your-faro-endpoint.com',
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

Filtering is unrestricted. Dropping rrweb Meta or FullSnapshot events can make later events
unplayable; the application owns that decision. Replay's `beforeSend` runs before reservation,
so its dropped events consume no sequence number. The global Faro `config.beforeSend` runs after
reservation and can leave a gap, just like serialization or delivery failure. Retries reuse the
original event identity.

## Recording identity and lifecycle

Each `faro.session_recording.event` has three identity attributes:

| Attribute      | Meaning                                                          |
| -------------- | ---------------------------------------------------------------- |
| `recording_id` | One recording for a Faro owner, tab, and captured session.       |
| `seq`          | Sequence number across the entire recording, beginning at zero.  |
| `gen`          | Snapshot generation, advanced by each accepted rrweb Meta event. |

A Faro owner consists of the global object key and application name, namespace, and environment.
Changing a deployment version does not change the owner. Replay requires the Web Locks API and
holds an exclusive recording lock before starting rrweb. Only one Replay instrumentation can
register with a shared rrweb runtime, including while paused.

One checkpoint in the tab's `sessionStorage` preserves the recording and counters through clean
navigation, reload, BFCache restoration, and instrumentation replacement. Counters stay in memory
while the lock is held and are saved on release. Inactivity pauses retain the lock and counters;
resuming starts a fresh snapshot. The `started`, `paused`, and `resumed` lifecycle events include
`recording_id` and bypass deduplication.

Replay releases on `pageswap`, `pagehide`, and supported `freeze` events. Background visibility
alone does not release ownership. A persisted `pageshow` or supported `resume` reacquires and
rereads the checkpoint. If navigation is abandoned after `pageswap`, the next trusted pointer or
keyboard interaction in the visible retained document restarts recording. Initial or resumed
startup failures can also retry on later interaction; there is no automatic retry timer.

Missing, malformed, or unfinished checkpoints recover under a new recording ID. Storage failures
use the same lock protocol with document-local counters; same-document replacement can continue,
but a later document may need a new ID. Earlier experimental checkpoint formats are ignored.

Browser-copied tab state has limits. A copy of an active checkpoint waits without recording until
the source releases, then starts a new ID. That wait can last indefinitely while the source retains
its lock, including during inactivity. A copy of a stale clean checkpoint can reuse sequence
numbers already emitted by the source, despite exclusive locks. Detection and targeted restart
of those conflicts are future work.

The installed rrweb version still has a partial-startup cleanup limitation tracked in
[grafana/rrweb#59](https://github.com/grafana/rrweb/issues/59). Faro guards obsolete callbacks and
defers stop/replacement beyond rrweb callbacks; the upstream cleanup fix and dependency update
remain separate work.

## Privacy and Security

This instrumentation records user interactions on your website. Make sure to:

1. **Review masking options for your use case** - By default, all input values and text content are masked.
   If needed, you can make masking more selective with `maskAllInputs`, `maskInputOptions`, and `maskTextSelector`
2. **Use CSS selectors** - Use `maskTextSelector` to mask sensitive content, `blockSelector` to completely exclude elements
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
  // Ignore certain elements (won't be recorded at all)
  ignoreSelector: '.analytics-widget',
  // Filter or transform events before sending
  beforeSend: (event) => {
    // Example: Skip events that might contain sensitive data
    if (event.type === 3 && event.data?.source === 'CanvasMutation') {
      return null; // Skip this event
    }
    return event; // Send the event as-is
  },
});
```
