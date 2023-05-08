export type ObserveEntries = { type: string; buffered: boolean; [key: string]: any };

export interface PerformanceTimelineInstrumentationOptions {
  // The Performance Entry types which shall be observed
  observeEntryTypes?: ObserveEntries[];

  // The size of the browser's resource timing buffer which stores the "resource" performance entries.
  resourceTimingBufferSize?: number;

  // If resource buffer size is full, set this as the new
  maxResourceTimingBufferSize?: number;

  // For these URLs no events will be tracked
  ignoredUrls?: Array<string | RegExp>;

  // Mutate performance entry before emit. Return false if entry shall be skipped. Parameter is the JSON representation of the PerformanceEntry as returned by calling it's own toJson() function.
  beforeEmit?: (performanceEntryJSON: any) => Record<string, any> | false;
}
