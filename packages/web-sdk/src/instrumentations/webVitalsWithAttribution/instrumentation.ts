import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals/attribution'
import type { Metric } from 'web-vitals/attribution'

import { BaseInstrumentation, VERSION } from '@grafana/faro-core';
import type  { MeasurementEvent, PushMeasurementOptions } from '@grafana/faro-core'

type Values = MeasurementEvent['values']
type Context = Required<PushMeasurementOptions>['context']

const connectionTime = 'connection_time';
const dnsTime = 'dns_time';
const element = 'element';
const elementRenderDelay = 'element_render_delay';
const eventTarget = 'event_target';
const eventTime = 'event_time';
const eventType = 'event_type';
const firstByteToFCP = 'first_byte_to_fcp';
const largestShiftEntry = 'largest_shift_entry';
const largestShiftTarget = 'largest_shift_target';
const largestShiftTime = 'largest_shift_time';
const largestShiftValue = 'largest_shift_value';
const loadState = 'load_state';
const requestTime = 'request_time';
const resourceLoadDelay = 'resource_load_delay';
const resourceLoadTime = 'resource_load_time';
const timeToFirstByte = 'time_to_first_byte';
const waitingTime = 'waiting_time';

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
      this.addIfPresent(values, largestShiftEntry, metric.attribution.largestShiftEntry?.value)
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
      this.addIfPresent(values, eventTime, metric.attribution.eventTime)

      const context = this.buildInitialContext(metric)
      this.addIfPresent(context, eventTarget, metric.attribution.eventTarget)
      this.addIfPresent(context, eventType, metric.attribution.eventType)
      this.addIfPresent(context, loadState, metric.attribution.loadState)

      this.pushMeasurement(values, context)
    })
  }

  private measureLCP(): void {
    onLCP((metric) => {
      const values = this.buildInitialValues(metric)
      this.addIfPresent(values, elementRenderDelay, metric.attribution.elementRenderDelay)
      this.addIfPresent(values, resourceLoadDelay, metric.attribution.resourceLoadDelay)
      this.addIfPresent(values, resourceLoadTime, metric.attribution.resourceLoadTime)
      this.addIfPresent(values, timeToFirstByte, metric.attribution.timeToFirstByte)

      const context = this.buildInitialContext(metric)
      this.addIfPresent(context, element, metric.attribution.element)

      this.pushMeasurement(values, context)
    })
  }

  private measureTTFB(): void {
    onTTFB((metric) => {
      const values = this.buildInitialValues(metric)
      this.addIfPresent(values, dnsTime, metric.attribution.dnsTime)
      this.addIfPresent(values, connectionTime, metric.attribution.connectionTime)
      this.addIfPresent(values, requestTime, metric.attribution.requestTime)
      this.addIfPresent(values, waitingTime, metric.attribution.waitingTime)

      const context = this.buildInitialContext(metric)

      this.pushMeasurement(values, context)
    })
  }

  private buildInitialValues(metric: Metric): Values {
    const indicator = metric.name.toLowerCase()
    return { [indicator]: metric.value }
  }

  private buildInitialContext(metric: Metric): Context {
    return { rating: metric.rating }
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
