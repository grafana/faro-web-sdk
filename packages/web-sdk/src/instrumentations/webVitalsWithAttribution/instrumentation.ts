import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals/attribution'
import type { Metric } from 'web-vitals/attribution'

import { BaseInstrumentation, VERSION } from '@grafana/faro-core';
import type  { MeasurementEvent, PushMeasurementOptions } from '@grafana/faro-core'

import { getItem, webStorageType } from '../../utils';
import { NAVIGATION_ID_STORAGE_KEY } from '../performance'

type Values = MeasurementEvent['values']
type Context = Required<PushMeasurementOptions>['context']

const cacheDuration = 'cache_duration';
const connectionDuration = 'connection_duration';
const dnsDuration = 'dns_duration';
const element = 'element';
const elementRenderDelay = 'element_render_delay';
const eventTarget = 'event_target';
const eventTime = 'event_time';
const eventType = 'event_type';
const firstByteToFCP = 'first_byte_to_fcp';
const inputDelay = 'input_delay';
const interactionTarget = 'interaction_target';
const interactionTime = 'interaction_time';
const interactionType = 'interaction_type';
const largestShiftTarget = 'largest_shift_target';
const largestShiftTime = 'largest_shift_time';
const largestShiftValue = 'largest_shift_value';
const loadState = 'load_state';
const nextPaintTime = 'next_paint_time';
const presentationDelay = 'presentation_delay';
const processingDuration = 'processing_duration';
const requestDuration = 'request_duration';
const resourceLoadDelay = 'resource_load_delay';
const resourceLoadDuration = 'resource_load_duration';
const timeToFirstByte = 'time_to_first_byte';
const waitingDuration = 'waiting_duration';

export class WebVitalsWithAttributionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-web-vitals-with-attribution'
  readonly version = VERSION

  initialize(): void {
    this.logDebug('Initializing');
    this.measureCLS()
    this.measureFCP()
    this.measureFID()
    this.measureINP()
    this.measureLCP()
    this.measureTTFB()
  }

  private measureCLS(): void {
    onCLS((metric) => {
      const values = this.buildInitialValues(metric)
      this.addIfPresent(values, largestShiftValue, metric.attribution.largestShiftValue)
      this.addIfPresent(values, largestShiftTime, metric.attribution.largestShiftTime)

      const context = this.buildInitialContext(metric)
      this.addIfPresent(context, loadState, metric.attribution.loadState)
      this.addIfPresent(context, largestShiftTarget, metric.attribution.largestShiftTarget)

      this.pushMeasurement(values, context)
    })
  }

  private measureFCP(): void {
    onFCP((metric) => {
      const values = this.buildInitialValues(metric)
      this.addIfPresent(values, firstByteToFCP, metric.attribution.firstByteToFCP)
      this.addIfPresent(values, timeToFirstByte, metric.attribution.timeToFirstByte)

      const context = this.buildInitialContext(metric)
      this.addIfPresent(context, loadState, metric.attribution.loadState)

      this.pushMeasurement(values, context)
    })
  }

  private measureFID(): void {
    onFID((metric) => {
      const values = this.buildInitialValues(metric)
      this.addIfPresent(values, eventTime, metric.attribution.eventTime)

      const context = this.buildInitialContext(metric)
      this.addIfPresent(context, eventTarget, metric.attribution.eventTarget)
      this.addIfPresent(context, eventType, metric.attribution.eventType)
      this.addIfPresent(context, loadState, metric.attribution.loadState)

      this.pushMeasurement(values, context)
    })
  }

  private measureINP(): void {
    onINP((metric) => {
      const values = this.buildInitialValues(metric)
      this.addIfPresent(values, interactionTime, metric.attribution.interactionTime)
      this.addIfPresent(values, presentationDelay, metric.attribution.presentationDelay)
      this.addIfPresent(values, inputDelay, metric.attribution.inputDelay)
      this.addIfPresent(values, processingDuration, metric.attribution.processingDuration)
      this.addIfPresent(values, nextPaintTime, metric.attribution.nextPaintTime)

      const context = this.buildInitialContext(metric)
      this.addIfPresent(context, loadState, metric.attribution.loadState)
      this.addIfPresent(context, interactionTarget, metric.attribution.interactionTarget)
      this.addIfPresent(context, interactionType, metric.attribution.interactionType)

      this.pushMeasurement(values, context)
    })
  }

  private measureLCP(): void {
    onLCP((metric) => {
      const values = this.buildInitialValues(metric)
      this.addIfPresent(values, elementRenderDelay, metric.attribution.elementRenderDelay)
      this.addIfPresent(values, resourceLoadDelay, metric.attribution.resourceLoadDelay)
      this.addIfPresent(values, resourceLoadDuration, metric.attribution.resourceLoadDuration)
      this.addIfPresent(values, timeToFirstByte, metric.attribution.timeToFirstByte)

      const context = this.buildInitialContext(metric)
      this.addIfPresent(context, element, metric.attribution.element)

      this.pushMeasurement(values, context)
    })
  }

  private measureTTFB(): void {
    onTTFB((metric) => {
      const values = this.buildInitialValues(metric)
      this.addIfPresent(values, dnsDuration, metric.attribution.dnsDuration)
      this.addIfPresent(values, connectionDuration, metric.attribution.connectionDuration)
      this.addIfPresent(values, requestDuration, metric.attribution.requestDuration)
      this.addIfPresent(values, waitingDuration, metric.attribution.waitingDuration)
      this.addIfPresent(values, cacheDuration, metric.attribution.cacheDuration)

      const context = this.buildInitialContext(metric)

      this.pushMeasurement(values, context)
    })
  }

  private buildInitialValues(metric: Metric): Values {
    const indicator = metric.name.toLowerCase()
    return {
      [indicator]: metric.value,
      delta: metric.delta,
    }
  }

  private buildInitialContext(metric: Metric): Context {
    const navigationEntryId = getItem(NAVIGATION_ID_STORAGE_KEY, webStorageType.session) ?? 'unknown';

    return {
      id: metric.id,
      rating: metric.rating,
      navigation_type: metric.navigationType,
      navigation_entry_id: navigationEntryId,
    }
  }

  private pushMeasurement(values: Values, context: Context): void {
    const type = 'web-vitals'
    this.api.pushMeasurement({ type, values }, { context })
  }

  private addIfPresent(source: Values | Context, key: string, metric?: number | string): void {
    if (metric) {
      source[key] = metric
    }
  }
}
