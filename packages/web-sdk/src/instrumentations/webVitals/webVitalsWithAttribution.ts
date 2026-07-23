import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals/attribution';
import type { Metric } from 'web-vitals/attribution';

import { unknownString } from '@grafana/faro-core';
import type { Config, MeasurementEvent, MeasurementsAPI, PushMeasurementOptions } from '@grafana/faro-core';

import { getItem, webStorageType } from '../../utils';
import { NAVIGATION_ID_STORAGE_KEY } from '../instrumentationConstants';

type Values = MeasurementEvent['values'];
type Context = Required<PushMeasurementOptions>['context'];

// `deliveryType` is part of the Resource Timing spec but is not yet included in TypeScript's DOM lib types.
// refs: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/deliveryType
type ResourceTimingWithDeliveryType = PerformanceResourceTiming & { deliveryType?: string };

// duplicate keys saved in variables to save bundle size
// refs: https://github.com/grafana/faro-web-sdk/pull/595#discussion_r1615833968
const loadStateKey = 'load_state';
const timeToFirstByteKey = 'time_to_first_byte';

export class WebVitalsWithAttribution {
  constructor(
    private corePushMeasurement: MeasurementsAPI['pushMeasurement'],
    private webVitalConfig?: Config['webVitalsInstrumentation']
  ) {}

  initialize(): void {
    this.measureCLS();
    this.measureFCP();
    this.measureINP();
    this.measureLCP();
    this.measureTTFB();
  }

  private measureCLS(): void {
    onCLS(
      (metric) => {
        const { loadState, largestShiftValue, largestShiftTime, largestShiftTarget } = metric.attribution;

        const values = this.buildInitialValues(metric);
        this.addIfPresent(values, 'largest_shift_value', largestShiftValue);
        this.addIfPresent(values, 'largest_shift_time', largestShiftTime);

        const context = this.buildInitialContext(metric);
        this.addIfPresent(context, loadStateKey, loadState);
        this.addIfPresent(context, 'largest_shift_target', largestShiftTarget);

        this.pushMeasurement(values, context);
      },
      { reportAllChanges: this.webVitalConfig?.reportAllChanges }
    );
  }

  private measureFCP(): void {
    onFCP(
      (metric) => {
        const { firstByteToFCP, timeToFirstByte, loadState } = metric.attribution;

        const values = this.buildInitialValues(metric);
        this.addIfPresent(values, 'first_byte_to_fcp', firstByteToFCP);
        this.addIfPresent(values, timeToFirstByteKey, timeToFirstByte);

        const context = this.buildInitialContext(metric);
        this.addIfPresent(context, loadStateKey, loadState);

        this.pushMeasurement(values, context);
      },
      { reportAllChanges: this.webVitalConfig?.reportAllChanges }
    );
  }

  private measureINP(): void {
    onINP(
      (metric) => {
        const {
          interactionTime,
          presentationDelay,
          inputDelay,
          processingDuration,
          nextPaintTime,
          loadState,
          interactionTarget,
          interactionType,
          totalScriptDuration,
          totalStyleAndLayoutDuration,
          totalPaintDuration,
          totalUnattributedDuration,
          longestScript,
        } = metric.attribution;

        const values = this.buildInitialValues(metric);
        this.addIfPresent(values, 'interaction_time', interactionTime);
        this.addIfPresent(values, 'presentation_delay', presentationDelay);
        this.addIfPresent(values, 'input_delay', inputDelay);
        this.addIfPresent(values, 'processing_duration', processingDuration);
        this.addIfPresent(values, 'next_paint_time', nextPaintTime);
        this.addIfPresent(values, 'total_script_duration', totalScriptDuration);
        this.addIfPresent(values, 'total_style_and_layout_duration', totalStyleAndLayoutDuration);
        this.addIfPresent(values, 'total_paint_duration', totalPaintDuration);
        this.addIfPresent(values, 'total_unattributed_duration', totalUnattributedDuration);
        this.addIfPresent(values, 'longest_script_intersecting_duration', longestScript?.intersectingDuration);

        const context = this.buildInitialContext(metric);
        this.addIfPresent(context, loadStateKey, loadState);
        this.addIfPresent(context, 'interaction_target', interactionTarget);
        this.addIfPresent(context, 'interaction_type', interactionType);
        this.addIfPresent(context, 'longest_script_subpart', longestScript?.subpart);
        this.addIfPresent(context, 'longest_script_invoker', longestScript?.entry.invoker);
        this.addIfPresent(context, 'longest_script_invoker_type', longestScript?.entry.invokerType);
        this.addIfPresent(context, 'longest_script_source_url', longestScript?.entry.sourceURL);
        this.addIfPresent(context, 'longest_script_source_function_name', longestScript?.entry.sourceFunctionName);
        this.addIfPresent(
          context,
          'longest_script_source_char_position',
          longestScript?.entry.sourceCharPosition !== undefined
            ? String(longestScript.entry.sourceCharPosition)
            : undefined
        );

        this.pushMeasurement(values, context);
      },
      { reportAllChanges: this.webVitalConfig?.reportAllChanges }
    );
  }

  private measureLCP(): void {
    onLCP(
      (metric) => {
        const {
          elementRenderDelay,
          resourceLoadDelay,
          resourceLoadDuration,
          timeToFirstByte,
          target,
          url,
          lcpResourceEntry,
        } = metric.attribution;

        const values = this.buildInitialValues(metric);
        this.addIfPresent(values, 'element_render_delay', elementRenderDelay);
        this.addIfPresent(values, 'resource_load_delay', resourceLoadDelay);
        this.addIfPresent(values, 'resource_load_duration', resourceLoadDuration);
        this.addIfPresent(values, timeToFirstByteKey, timeToFirstByte);

        const context = this.buildInitialContext(metric);
        this.addIfPresent(context, 'element', target);

        if (this.webVitalConfig?.trackLcpAttributionResource) {
          this.addIfPresent(context, 'resource_url', url);
          this.addIfPresent(
            context,
            'resource_delivery_type',
            (lcpResourceEntry as ResourceTimingWithDeliveryType | undefined)?.deliveryType
          );
          this.addIfPresent(context, 'resource_initiator_type', lcpResourceEntry?.initiatorType);
        }

        this.pushMeasurement(values, context);
      },
      { reportAllChanges: this.webVitalConfig?.reportAllChanges }
    );
  }

  private measureTTFB(): void {
    onTTFB(
      (metric) => {
        const { dnsDuration, connectionDuration, requestDuration, waitingDuration, cacheDuration } = metric.attribution;

        const values = this.buildInitialValues(metric);
        this.addIfPresent(values, 'dns_duration', dnsDuration);
        this.addIfPresent(values, 'connection_duration', connectionDuration);
        this.addIfPresent(values, 'request_duration', requestDuration);
        this.addIfPresent(values, 'waiting_duration', waitingDuration);
        this.addIfPresent(values, 'cache_duration', cacheDuration);

        const context = this.buildInitialContext(metric);

        this.pushMeasurement(values, context);
      },
      { reportAllChanges: this.webVitalConfig?.reportAllChanges }
    );
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
