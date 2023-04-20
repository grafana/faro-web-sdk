# @grafana/instrumentation-performance-timeline

Faro instrumentation to capture [Performance Timeline](https://www.w3.org/TR/performance-timeline/)
data.

❗️*Warning*: this package is experimental and may be subject to frequent and breaking changes.
Use at your own risk.❗️

Note:\
The PerformanceTimelineInstrumentation emits a lot of events shortly after another. This will quickly
exhaust the requests buffer of the Faro transports which eventually leads to dropped events.
We strongly recommend using this instrumentation in conjunctions with the Faro BatchTransport.

Note:\
At the time of writing not all Faro transports support receiving batched RUM data.
For information and compatibility refer to the
[BatchTransport README](https://github.com/grafana/faro-web-sdk/blob/80e284b9ba17ed7256ff3b063bf4663cc9d94f60/packages/transport-batch/README.md#L1).

## Installation

```ts
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-react';
import { BatchTransport } from '@grafana/faro-transport-batch';
import { OtlpHttpTransport } from '@grafana/faro-transport-otlp-http';

initializeFaro({
  // ...
  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),
  ],
  transports: [
    // Add batch transport.
    new BatchTransport(
      // Choose the Faro transport of your choice.
      new OtlpHttpTransport({
        apiKey: env.faro.apiKey,
        logsURL: 'https://example.com/v1/logs',
        tracesURL: 'https://example.com/v1/traces',
      })()
    ),
  ],
});
```

## Usage

### What entry types can I capture?

The FaroPerformanceTimeline instrumentation is able to track all entry types as defined by
[PerformanceEntry: entryType property](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEntry/entryType).

By default we track entries of type
[navigation](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming)
and [resource](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming).
These entry types allow you to track the load timings of the assets of your page or spa.

You can specify which entry types to track via the `observeEntryTypes` array in the config.
This will also overwrite the default entry types. Since the usage of the default entry types is so
common, we provide them as a constant (`DEFAULT_PERFORMANCE_TIMELINE_ENTRY_TYPES`) you can add
alongside your owen entries.

#### Example of how to specify entry types to track

Alongside the default entry types the example adds entries to track
[PerformanceEventTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming),
[mark](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceMark) and
[PerformanceMeasure](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceMeasure).

```ts
new PerformanceTimelineInstrumentation({
  observeEntryTypes: [
    ...DEFAULT_PERFORMANCE_TIMELINE_ENTRY_TYPES,
    { type: 'event', durationThreshold: 16, buffered: true },
    { type: 'mark',  buffered: true },
    { type: 'measure', , buffered: true },
  ],
}),
```

Note:
Browser support for entry types differs. In the case that one of your specified entries
is not support Faro will log a message.

### How can I skip entries?

#### By URL

It is possible to skip capturing entries by URL. This is can be archived by specifying respective
URLs in the `ignoredURLs` array.
By default Faro skips urls defined by the transports. Usually these are the receiver URLs.

##### Example of how to specify skip URLs

```ts
elineInstrumentation({
  ignoredURLs: [...]
}),
```

Note:\
This overwrites the default skip URLs.

#### By key/value pair

To reduce noise, you can skip entries which contain a specific key/value combination.
This is done by defining them in the `skipEntries` array.
This will completely skip every performance entry which contains the specified key/value pair.

##### Example of how to specify skip entries

```ts
new PerformanceTimelineInstrumentation({
  skipEntries: [
      { key: 'initiatorType', value:  'link'},
  ]
}),
```

#### By key/value pair and entry type

If you do want to skip all entries containing the specified key/value pair, you can scope them to
specific entry types only. This will only skip the specified entry types containing a specific
key/value pair.

```ts
new PerformanceTimelineInstrumentation({
  skipEntries: [
    {
      // Skip back/forward navigations and page reloads to remove some non human visible navigations
      applyToEntryTypes: ['navigation'],
      skipEntries: [
        { key: 'type', value: 'reload' },
        { key: 'type', value: 'back_forward' },
      ],
    },
  ],
}),
```

### Config Options

- `observeEntryTypes: ObserveEntries[]`: The Performance Entry types which should be observed.
- `resourceTimingBufferSize: number`: The size of the browser's resource timing buffer which stores
  the "resource" performance entries.
- `maxResourceTimingBufferSize: number`: If resource buffer size is full, set this as the new.
- `skipEntries: Array<KeyValueSkipEntry | ScopedSkipEntry>`: Entries containing key/value
  combinations which should be skipped.
- `ignoredUrls?: Array<string | RegExp>`: URLs which should be ignored.
