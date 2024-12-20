import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals/attribution';
import type { Metric } from 'web-vitals/attribution';

import { unknownString } from '@grafana/faro-core';
import type { MeasurementEvent, MeasurementsAPI, PushMeasurementOptions } from '@grafana/faro-core';

import { getItem, webStorageType } from '../../utils';
import { NAVIGATION_ID_STORAGE_KEY } from '../instrumentationConstants';

type Values = MeasurementEvent['values'];
type Context = Required<PushMeasurementOptions>['context'];

// duplicate keys saved in variables to save bundle size
// refs: https://github.com/grafana/faro-web-sdk/pull/595#discussion_r1615833968
const loadStateKey = 'load_state';
const timeToFirstByteKey = 'time_to_first_byte';

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
      const { loadState, largestShiftValue, largestShiftTime, largestShiftTarget } = metric.attribution;

      const values = this.buildInitialValues(metric);
      this.addIfPresent(values, 'largest_shift_value', largestShiftValue);
      this.addIfPresent(values, 'largest_shift_time', largestShiftTime);

      const context = this.buildInitialContext(metric);
      this.addIfPresent(context, loadStateKey, loadState);
      this.addIfPresent(context, 'largest_shift_target', largestShiftTarget);

      this.pushMeasurement(values, context);
    });
  }

  private measureFCP(): void {
    onFCP((metric) => {
      const { firstByteToFCP, timeToFirstByte, loadState } = metric.attribution;

      const values = this.buildInitialValues(metric);
      this.addIfPresent(values, 'first_byte_to_fcp', firstByteToFCP);
      this.addIfPresent(values, timeToFirstByteKey, timeToFirstByte);

      const context = this.buildInitialContext(metric);
      this.addIfPresent(context, loadStateKey, loadState);

      this.pushMeasurement(values, context);
    });
  }

  private measureFID(): void {
    onFID((metric) => {
      const { eventTime, eventTarget, eventType, loadState } = metric.attribution;

      const values = this.buildInitialValues(metric);
      this.addIfPresent(values, 'event_time', eventTime);

      const context = this.buildInitialContext(metric);
      this.addIfPresent(context, 'event_target', eventTarget);
      this.addIfPresent(context, 'event_type', eventType);
      this.addIfPresent(context, loadStateKey, loadState);

      this.pushMeasurement(values, context);
    });
  }

  private measureINP(): void {
    onINP((metric) => {
      const {
        interactionTime,
        presentationDelay,
        inputDelay,
        processingDuration,
        nextPaintTime,
        loadState,
        interactionTarget,
        interactionType,
      } = metric.attribution;

      const values = this.buildInitialValues(metric);
      this.addIfPresent(values, 'interaction_time', interactionTime);
      this.addIfPresent(values, 'presentation_delay', presentationDelay);
      this.addIfPresent(values, 'input_delay', inputDelay);
      this.addIfPresent(values, 'processing_duration', processingDuration);
      this.addIfPresent(values, 'next_paint_time', nextPaintTime);

      const context = this.buildInitialContext(metric);
      this.addIfPresent(context, loadStateKey, loadState);
      this.addIfPresent(context, 'interaction_target', interactionTarget);
      this.addIfPresent(context, 'interaction_type', interactionType);

      this.pushMeasurement(values, context);
    });
  }

  private measureLCP(): void {
    onLCP((metric) => {
      const { elementRenderDelay, resourceLoadDelay, resourceLoadDuration, timeToFirstByte, element } =
        metric.attribution;

      const values = this.buildInitialValues(metric);
      this.addIfPresent(values, 'element_render_delay', elementRenderDelay);
      this.addIfPresent(values, 'resource_load_delay', resourceLoadDelay);
      this.addIfPresent(values, 'resource_load_duration', resourceLoadDuration);
      this.addIfPresent(values, timeToFirstByteKey, timeToFirstByte);

      const context = this.buildInitialContext(metric);
      this.addIfPresent(context, 'element', element);

      this.pushMeasurement(values, context);
    });
  }

  private measureTTFB(): void {
    onTTFB((metric) => {
      const { dnsDuration, connectionDuration, requestDuration, waitingDuration, cacheDuration } = metric.attribution;

      const values = this.buildInitialValues(metric);
      this.addIfPresent(values, 'dns_duration', dnsDuration);
      this.addIfPresent(values, 'connection_duration', connectionDuration);
      this.addIfPresent(values, 'request_duration', requestDuration);
      this.addIfPresent(values, 'waiting_duration', waitingDuration);
      this.addIfPresent(values, 'cache_duration', cacheDuration);

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
    const navigationEntryId = getItem(NAVIGATION_ID_STORAGE_KEY, webStorageType.session) ?? unknownString;

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
