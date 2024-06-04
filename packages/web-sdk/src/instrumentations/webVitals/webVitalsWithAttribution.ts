import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals/attribution';
import type { Metric } from 'web-vitals/attribution';

import type { MeasurementEvent, MeasurementsAPI, PushMeasurementOptions } from '@grafana/faro-core';

import { getItem, webStorageType } from '../../utils';
import { NAVIGATION_ID_STORAGE_KEY } from '../instrumentationConstants';

type Values = MeasurementEvent['values'];
type Context = Required<PushMeasurementOptions>['context'];

// duplicate keys saved in variables to save bundle size
// refs: https://github.com/grafana/faro-web-sdk/pull/595#discussion_r1615833968
const loadState = 'load_state';
const timeToFirstByte = 'time_to_first_byte';

export class WebVitalsWithAttribution {
  constructor(private corePushMeasurement: MeasurementsAPI['pushMeasurement']) {}

  initialize(): void {
    this.measureCLS();
    this.measureFCP();
    this.measureFID();
    this.measureINP();
    this.measureLCP();
    this.measureTTFB();
  }

  private measureCLS(): void {
    onCLS((metric) => {
      const values = this.buildInitialValues(metric);
      this.addIfPresent(values, 'largest_shift_value', metric.attribution.largestShiftValue);
      this.addIfPresent(values, 'largest_shift_time', metric.attribution.largestShiftTime);

      const context = this.buildInitialContext(metric);
      this.addIfPresent(context, loadState, metric.attribution.loadState);
      this.addIfPresent(context, 'largest_shift_target', metric.attribution.largestShiftTarget);

      this.pushMeasurement(values, context);
    });
  }

  private measureFCP(): void {
    onFCP((metric) => {
      const values = this.buildInitialValues(metric);
      this.addIfPresent(values, 'first_byte_to_fcp', metric.attribution.firstByteToFCP);
      this.addIfPresent(values, timeToFirstByte, metric.attribution.timeToFirstByte);

      const context = this.buildInitialContext(metric);
      this.addIfPresent(context, loadState, metric.attribution.loadState);

      this.pushMeasurement(values, context);
    });
  }

  private measureFID(): void {
    onFID((metric) => {
      const values = this.buildInitialValues(metric);
      this.addIfPresent(values, 'event_time', metric.attribution.eventTime);

      const context = this.buildInitialContext(metric);
      this.addIfPresent(context, 'event_target', metric.attribution.eventTarget);
      this.addIfPresent(context, 'event_type', metric.attribution.eventType);
      this.addIfPresent(context, loadState, metric.attribution.loadState);

      this.pushMeasurement(values, context);
    });
  }

  private measureINP(): void {
    onINP((metric) => {
      const values = this.buildInitialValues(metric);
      this.addIfPresent(values, 'interaction_time', metric.attribution.interactionTime);
      this.addIfPresent(values, 'presentation_delay', metric.attribution.presentationDelay);
      this.addIfPresent(values, 'input_delay', metric.attribution.inputDelay);
      this.addIfPresent(values, 'processing_duration', metric.attribution.processingDuration);
      this.addIfPresent(values, 'next_paint_time', metric.attribution.nextPaintTime);

      const context = this.buildInitialContext(metric);
      this.addIfPresent(context, loadState, metric.attribution.loadState);
      this.addIfPresent(context, 'interaction_target', metric.attribution.interactionTarget);
      this.addIfPresent(context, 'interaction_type', metric.attribution.interactionType);

      this.pushMeasurement(values, context);
    });
  }

  private measureLCP(): void {
    onLCP((metric) => {
      const values = this.buildInitialValues(metric);
      this.addIfPresent(values, 'element_render_delay', metric.attribution.elementRenderDelay);
      this.addIfPresent(values, 'resource_load_delay', metric.attribution.resourceLoadDelay);
      this.addIfPresent(values, 'resource_load_duration', metric.attribution.resourceLoadDuration);
      this.addIfPresent(values, timeToFirstByte, metric.attribution.timeToFirstByte);

      const context = this.buildInitialContext(metric);
      this.addIfPresent(context, 'element', metric.attribution.element);

      this.pushMeasurement(values, context);
    });
  }

  private measureTTFB(): void {
    onTTFB((metric) => {
      const values = this.buildInitialValues(metric);
      this.addIfPresent(values, 'dns_duration', metric.attribution.dnsDuration);
      this.addIfPresent(values, 'connection_duration', metric.attribution.connectionDuration);
      this.addIfPresent(values, 'request_duration', metric.attribution.requestDuration);
      this.addIfPresent(values, 'waiting_duration', metric.attribution.waitingDuration);
      this.addIfPresent(values, 'cache_duration', metric.attribution.cacheDuration);

      const context = this.buildInitialContext(metric);

      this.pushMeasurement(values, context);
    });
  }

  private buildInitialValues(metric: Metric): Values {
    const indicator = metric.name.toLowerCase();
    return {
      [indicator]: metric.value,
      delta: metric.delta,
    };
  }

  private buildInitialContext(metric: Metric): Context {
    const navigationEntryId = getItem(NAVIGATION_ID_STORAGE_KEY, webStorageType.session) ?? 'unknown';

    return {
      id: metric.id,
      rating: metric.rating,
      navigation_type: metric.navigationType,
      navigation_entry_id: navigationEntryId,
    };
  }

  private pushMeasurement(values: Values, context: Context): void {
    const type = 'web-vitals';
    this.corePushMeasurement({ type, values }, { context });
  }

  private addIfPresent(source: Values | Context, key: string, metric?: number | string): void {
    if (metric) {
      source[key] = metric;
    }
  }
}
