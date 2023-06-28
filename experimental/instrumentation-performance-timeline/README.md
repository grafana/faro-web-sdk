# @grafana/instrumentation-performance-timeline

Faro instrumentation to capture [Performance Timeline](https://www.w3.org/TR/performance-timeline/)
data.

❗️*Warning*: this package is experimental and may be subject to frequent and breaking changes.
Use at your own risk.❗️

## Installation

```ts
import { PerformanceTimelineInstrumentation } from '@grafana/faro-instrumentation-performance-timeline';
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-react';

initializeFaro({
  // ...
  instrumentations: [
    // Load the default Web instrumentations
    ...getWebInstrumentations(),
    new PerformanceTimelineInstrumentation(),
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
    { type: 'event', buffered: true },
    { type: 'mark',  buffered: true },
    { type: 'measure', , buffered: true },
  ],
}),
```

Additionally you can add all config properties a respective PerformanceEntry provides.
For example if you want to change the duration threshold for `PerformanceEventTiming`.

```ts
{ type: 'event', durationThreshold: 96, buffered: true },
```

Note:
Browser support for entry types differs. In the case that one of your specified entries
is not support Faro will log a message and does not register to track these entries.

### How can I skip entries?

#### By URL

It is possible to skip capturing entries by URL. This is can be archived by specifying respective
URLs in the `ignoredURLs` array.
By default Faro skips urls defined by the transports. Usually these are the receiver URLs.

##### Example of how to specify skip URLs

```ts
new PerformanceTimelineInstrumentation({
  ignoredURLs: [...]
}),
```

Note:\
This overwrites the default skip URLs.

#### By using the beforeEmit hook

You can use the beforeEmit hook to skip entries simply by returning `false` for the desired entry.
For more information see `Mutating or filtering performance entries` below.

##### Example: Skip back/forward navigation and page reloads to remove non human visible navigation

```ts
new PerformanceTimelineInstrumentation({
  beforeEmit: (performanceEntryJSON) => {
    const entryType = performanceEntryJSON.type;
    const type = performanceEntryJSON.type;

    if (entryType === 'navigation' && ['reload', 'back_forward'].includes(type)) {
      return false;
    }

    return performanceEntryJSON;
  },
});
```

### Mutating or filtering performance entries

The Performance Timeline emits a lot of data which quickly adds up. Often users mutate Performance
Entries to trim down the payload size of an entry, to further remove noise or if they need
a filter which can not be achieved with the above config options.

Therefore we provide the `beforeEmit` hook.

This hook triggers after all the other options mentioned above i. e. skipping entries by url.

The `beforeEmit` hook receives the json representation of a performance entry as a parameter and
either returns the performance entry which shall be send to the backend or `false` in case the
entire entry should be dropped.

`beforeEmit: (performanceEntry: performanceEntryJSON: any) => Record<string, any> | false;`

Note:\
The JSON representation of the performance entry is the object returned by calling the `toJSON()`
function of the respective PerformanceEntry.

### Config Options

- `observeEntryTypes: ObserveEntries[]`: The Performance Entry types which should be observed.
- `resourceTimingBufferSize: number`: The size of the browser's resource timing buffer which stores
  the "resource" performance entries.
- `maxResourceTimingBufferSize: number`: If resource buffer size is full, set this as the new.
- `ignoredUrls?: Array<string | RegExp>`: URLs which should be ignored.
- `beforeEmit?: (performanceEntryJSON: Record<string, any>) => Record<string, any> | false;`
  : Mutate a performance entry before emitting it. Parameter is the JSON representation of the
  PerformanceEntry. Return false if you want to skip an entire entry.
