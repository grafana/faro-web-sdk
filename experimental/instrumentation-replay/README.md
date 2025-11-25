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
      recordCrossOriginIframes: false,
    }),
  ],
});
```

## Configuration Options

### Privacy & Masking Options

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
- **`maskTextSelector`**: Custom CSS selector to mask specific elements
- **`blockSelector`**: CSS selector to completely block elements from recording
- **`ignoreSelector`**: CSS selector to ignore specific elements

### Recording Options

- **`recordCrossOriginIframes`** (default: `false`): Whether to record cross-origin iframes
- **`recordCanvas`** (default: `false`): Whether to record canvas elements
- **`collectFonts`** (default: `false`): Whether to collect font files
- **`inlineImages`** (default: `false`): Whether to inline images in the recording
- **`inlineStylesheet`** (default: `false`): Whether to inline stylesheets

### Hooks

- **`beforeSend`**: Custom function to transform or filter events before they are sent.
  Return the modified event or `null`/`undefined` to skip sending

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
