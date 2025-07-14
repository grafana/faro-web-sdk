# @grafana/faro-web-session-recording

Faro instrumentation for session recording with rrweb.

## Installation

```bash
npm install @grafana/faro-web-session-recording
```

## Usage

```typescript
import { SessionRecordingInstrumentation } from '@grafana/faro-web-session-recording';
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';

initializeFaro({
  url: 'https://your-faro-endpoint.com',
  instrumentations: [
    ...getWebInstrumentations(),
    new SessionRecordingInstrumentation({
      batchSize: 100,
      batchTimeout: 10000,
      sampling: true,
      samplingRate: 0.1,
      maskTextInputs: true,
    }),
  ],
});
```

## Configuration Options

- `batchSize` (default: 100): Maximum number of events to batch before sending
- `batchTimeout` (default: 10000): Maximum time to wait before sending a batch (in milliseconds)
- `sampling` (default: false): Whether to enable sampling for session recording
- `samplingRate` (default: 0.1): Sampling rate (0-1) when sampling is enabled
- `recordCrossOriginIframes` (default: false): Whether to record cross-origin iframes
- `maskTextInputs` (default: true): Whether to mask text inputs
- `maskAllInputs` (default: false): Whether to mask all inputs
- `maskAllText` (default: false): Whether to mask all text
- `maskSelector`: Custom CSS selector to mask elements
- `blockSelector`: CSS selector to block elements
- `ignoreSelector`: CSS selector to ignore elements
- `collectFonts` (default: false): Whether to collect fonts
- `inlineImages` (default: false): Whether to inline images
- `inlineStylesheet` (default: false): Whether to inline stylesheets
- `recordCanvas` (default: false): Whether to record canvas
- `recordLogs` (default: false): Whether to record logs
- `beforeRecord`: Custom hook to filter events before they are recorded
- `beforeSend`: Custom hook to transform events before they are sent

## Privacy and Security

This instrumentation records user interactions on your website. Make sure to:

1. Enable appropriate masking options for sensitive data
2. Consider sampling to reduce data volume
3. Review your privacy policy and obtain necessary user consent
4. Test the configuration to ensure no sensitive information is captured

## License

Apache-2.0
