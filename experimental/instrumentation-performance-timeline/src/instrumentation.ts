import { BaseInstrumentation, isArray, isObject, VERSION } from '@grafana/faro-core';

import type { ObserveEntries, PerformanceTimelineInstrumentationOptions } from './types';

const DEFAULT_RESOURCE_TIMING_BUFFER_SIZE = 250; // Same as browsers default size
const DEFAULT_MAX_RESOURCE_TIMING_BUFFER_SIZE = 500;

export const DEFAULT_PERFORMANCE_TIMELINE_ENTRY_TYPES = [
  { type: 'navigation', buffered: true },
  { type: 'resource', buffered: true },
];

/**
 * Instrumentation for Performance Timeline API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTimeline
 *
 * !!! This instrumentation is in experimental state and it's not meant to be used in production yet. !!!
 * !!! If you want to use it, do it at your own risk. !!!
 */
export class PerformanceTimelineInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-performance-timeline';
  readonly version = VERSION;

  private resourceTimingBufferSize: number;
  private maxResourceTimingBufferSize: number;
  private observer?: PerformanceObserver;
  private observeEntryTypes: ObserveEntries[];
  private ignoredUrls: PerformanceTimelineInstrumentationOptions['ignoredUrls'];

  constructor(private options?: PerformanceTimelineInstrumentationOptions) {
    super();

    this.resourceTimingBufferSize = options?.resourceTimingBufferSize ?? DEFAULT_RESOURCE_TIMING_BUFFER_SIZE;
    this.maxResourceTimingBufferSize = options?.maxResourceTimingBufferSize ?? DEFAULT_MAX_RESOURCE_TIMING_BUFFER_SIZE;
    this.observeEntryTypes = options?.observeEntryTypes ?? DEFAULT_PERFORMANCE_TIMELINE_ENTRY_TYPES;
  }

  initialize(): void {
    const isPerformanceObserverSupported = 'PerformanceObserver' in window;

    if (!isPerformanceObserverSupported) {
      this.internalLogger.info(
        'Browser does not support PerformanceObserver, stopping initialization of PerformanceTimelineInstrumentation'
      );
      return undefined;
    }

    this.validateIfObservedEntryTypesSupportedByBrowser();
    // Need to set ignored URLs here to ensure that instrumentations are already available
    this.setIgnoredUrls();
    this.configureResourceTimingBuffer();
    this.registerPerformanceObserver();
    this.observe();
  }

  private validateIfObservedEntryTypesSupportedByBrowser() {
    const unsupportedEntryTypes: string[] = [];

    for (const entryType of this.observeEntryTypes) {
      if (!PerformanceObserver.supportedEntryTypes.includes(entryType.type)) {
        unsupportedEntryTypes.push(entryType.type);
      }
    }

    if (unsupportedEntryTypes.length > 0) {
      this.observeEntryTypes = this.observeEntryTypes.filter(
        (entryType) => !unsupportedEntryTypes.includes(entryType.type)
      );

      this.internalLogger.info(
        `The following entryTypes are not supported by this browser: ${unsupportedEntryTypes}. Observing only supported entryTypes which are: ${this.observeEntryTypes.map(
          ({ type }) => type
        )}`
      );
    }
  }

  private setIgnoredUrls() {
    this.ignoredUrls = this.options?.ignoredUrls ?? this.getIgnoreUrls();
  }

  private configureResourceTimingBuffer() {
    performance.setResourceTimingBufferSize(this.resourceTimingBufferSize);
    performance.addEventListener('resourcetimingbufferfull', () => {
      this.internalLogger.info(
        `Resource Timing Buffer is full! Increasing buffer size to ${this.maxResourceTimingBufferSize}.`
      );
      performance.setResourceTimingBufferSize(this.maxResourceTimingBufferSize);
    });
  }

  private registerPerformanceObserver(): void {
    this.observer = new PerformanceObserver(this.handlePerformanceEntry.bind(this));
  }

  // This function is not meant to be used outside of the class. It's public for testing purposes.
  handlePerformanceEntry(list: PerformanceObserverEntryList, _observer: PerformanceObserver, droppedEntriesCount = 0) {
    for (const performanceEntry of list.getEntries()) {
      if (this.ignoredUrls?.some((url) => performanceEntry.name.match(url) != null)) {
        this.internalLogger.info('Drop performance entry because it matches one of the ignored URLs');
        continue;
      }

      let pEntry = performanceEntry.toJSON();

      if (typeof this.options?.beforeEmit === 'function') {
        const modifiedEntry = this.options.beforeEmit(pEntry);
        if (modifiedEntry === false) {
          this.internalLogger.info('Performance entry dropped because beforeEmit returned false.');
          continue;
        }

        pEntry = modifiedEntry;
      }

      this.api.pushEvent('faro.performanceEntry', this.objectValuesToString(pEntry));
    }

    // Dropped entries count is only available in chrome (03/03/2024)
    // https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver#browser_compatibility
    if (droppedEntriesCount > 0) {
      this.internalLogger.warn(`${droppedEntriesCount} entries got dropped due to the browser buffer being full.`);
    }
  }

  private observe(): void {
    this.observeEntryTypes?.forEach((performanceEntry) => {
      this.observer?.observe(performanceEntry);
    });
  }

  private getIgnoreUrls(): Array<string | RegExp> {
    return this.transports.transports?.flatMap((transport) => transport.getIgnoreUrls());
  }

  private objectValuesToString(object: Record<string, any> = {}): Record<string, string> {
    const o: Record<string, any> = {};

    for (const [key, value] of Object.entries(object)) {
      if (isArray(value)) {
        o[key] =
          value.length === 0
            ? JSON.stringify(value)
            : value.map((arrayValue: any) => this.objectValuesToString(arrayValue)).toString();
        continue;
      }

      if (isObject(value)) {
        o[key] = this.objectValuesToString();
        continue;
      }

      o[key] = value.toString();
    }

    return o;
  }
}
