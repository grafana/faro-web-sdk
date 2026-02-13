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
      maskInputFn: (value) => '*'.repeat(value.length),
      maskAllInputs: false,
      recordAfter: 'load',
      recordCrossOriginIframes: false,
    }),
  ],
});
```

## Configuration Options

### Privacy & Masking Options

<<<<<<< improve-instrumentation-replay-readme
| Key                | Type                                              | Default              | Description                                                                                                                              |
| ------------------ | ------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `maskAllInputs`    | `boolean`                                         | `false`              | Mask all input content as `*`                                                                                                            |
| `maskInputOptions` | `MaskInputOptions`                                | `{ password: true }` | Selectively mask specific input types (see below)                                                                                        |
| `maskInputFn`      | `(value: string, element: HTMLElement) => string` | `undefined`          | Customize mask input content recording logic                                                                                             |
| `maskTextSelector` | `string`                                          | `undefined`          | CSS selector for elements whose text content should be masked                                                                            |
| `blockSelector`    | `string`                                          | `undefined`          | CSS selector for elements that should be blocked from recording. Blocked elements are replaced with a placeholder of the same dimensions |
| `ignoreSelector`   | `string`                                          | `undefined`          | CSS selector for elements whose input events should be ignored                                                                           |

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
=======
- **`maskAllInputs`** (default: `false`): Whether to mask all input elements
- **`maskInputOptions`** (default: `{ password: true }`): Fine-grained control over which input types to mask.
  Available options:
  - `password` - Password inputs
  - `text` - Text inputs
  - `email` - Email inputs
  - `tel` - Telephone inputs
  - `number` - Number inputs
  - `search` - Search inputs
  - `url` - URL inputs
  - `date`, `datetime-local`, `month`, `week`, `time` - Date/time inputs
  - `color` - Color inputs
  - `range` - Range inputs
  - `textarea` - Textarea elements
  - `select` - Select dropdowns
- **`maskInputFn`**: Custom function to transform input values before they are recorded.
  Signature: `(value: string, element: HTMLElement) => string`
  - `value` - Current input value to be masked
  - `element` - The input element being masked
- **`maskTextSelector`**: Custom CSS selector to mask specific elements
- **`blockSelector`**: CSS selector to completely block elements from recording
- **`ignoreSelector`**: CSS selector to ignore specific elements
>>>>>>> main

### Recording Options

| Key                        | Type                           | Default  | Description                                                                                          |
| -------------------------- | ------------------------------ | -------- | ---------------------------------------------------------------------------------------------------- |
| `recordAfter`              | `'load' \| 'DOMContentLoaded'` | `'load'` | When to start recording if the document is not ready yet                                             |
| `recordCrossOriginIframes` | `boolean`                      | `false`  | Whether to record cross-origin iframes. rrweb must be injected in each child iframe for this to work |
| `recordCanvas`             | `boolean`                      | `false`  | Whether to record canvas element content                                                             |
| `collectFonts`             | `boolean`                      | `false`  | Whether to collect fonts used in the website                                                         |
| `inlineImages`             | `boolean`                      | `false`  | Whether to record image content                                                                      |
| `inlineStylesheet`         | `boolean`                      | `false`  | Whether to inline stylesheets in the recording events                                                |

### Hooks

| Key          | Type                                                           | Default     | Description                                                                                   |
| ------------ | -------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| `beforeSend` | `(event: eventWithTime) => eventWithTime \| null \| undefined` | `undefined` | Transform or filter events before they are sent. Return `null` or `undefined` to skip sending |

## Privacy and Security

This instrumentation records user interactions on your website. Make sure to:

1. **Enable appropriate masking options** - By default, only password inputs are masked.
   Configure `maskInputOptions` to mask additional sensitive fields
2. **Use CSS selectors** - Use `maskTextSelector` to mask sensitive content, `blockSelector` to completely exclude elements
3. **Implement filtering** - Use the `beforeSend` hook to filter or transform events before sending
4. **Review your privacy policy** - Ensure you have proper user consent for session recording
5. **Test your configuration** - Verify no sensitive information is captured in recordings

### Example: Advanced Privacy Configuration

```typescript
new ReplayInstrumentation({
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
