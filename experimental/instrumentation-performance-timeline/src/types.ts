export type ObserveEntries = { type: string; buffered: boolean; [key: string]: any };

export interface KeyValueSkipEntry {
  key: string;
  value: any;
}

export type ScopedSkipEntry = {
  applyToEntryTypes: string[];
  skipEntries: KeyValueSkipEntry[];
};

export interface PerformanceTimelineInstrumentationOptions {
  // The Performance Entry types which shall be observed
  observeEntryTypes?: ObserveEntries[];

  // The size of the browser's resource timing buffer which stores the "resource" performance entries.
  resourceTimingBufferSize?: number;

  // If resource buffer size is full, set this as the new
  maxResourceTimingBufferSize?: number;

  // Entries containing this key value combination will be skipped
  skipEntries?: Array<KeyValueSkipEntry | ScopedSkipEntry>;

  // For these URLs no events will be tracked
  ignoredUrls?: Array<string | RegExp>;
}
