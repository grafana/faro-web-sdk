import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals/attribution'
import type { Metric } from 'web-vitals/attribution'

import { BaseInstrumentation, VERSION } from '@grafana/faro-core';
import type  { MeasurementEvent, PushMeasurementOptions } from '@grafana/faro-core'

type Values = MeasurementEvent['values']
type Context = Required<PushMeasurementOptions>['context']

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
      this.addIfPresent(values, 'largest_shift_entry', metric.attribution.largestShiftEntry?.value)
      this.addIfPresent(values, 'largest_shift_value', metric.attribution.largestShiftValue)
      this.addIfPresent(values, 'largest_shift_time', metric.attribution.largestShiftTime)

      const context = this.buildInitialContext(metric)
      this.addIfPresent(context, 'load_state', metric.attribution.loadState)
      this.addIfPresent(context, 'largest_shift_target', metric.attribution.largestShiftTarget)

      this.pushMeasurement(values, context)
    })
  }

  private measureFCP(): void {
    onFCP((metric) => {
      const values = this.buildInitialValues(metric)
      this.addIfPresent(values, 'first_byte_to_fcp', metric.attribution.firstByteToFCP)
      this.addIfPresent(values, 'time_to_first_byte', metric.attribution.timeToFirstByte)

      const context = this.buildInitialContext(metric)
      this.addIfPresent(context, 'load_state', metric.attribution.loadState)

      this.pushMeasurement(values, context)
    })
  }

  private measureFID(): void {
    onFID((metric) => {
      const values = this.buildInitialValues(metric)
      this.addIfPresent(values, 'event_time', metric.attribution.eventTime)

      const context = this.buildInitialContext(metric)
      this.addIfPresent(context, 'event_target', metric.attribution.eventTarget)
      this.addIfPresent(context, 'event_type', metric.attribution.eventType)
      this.addIfPresent(context, 'load_state', metric.attribution.loadState)

      this.pushMeasurement(values, context)
    })
  }

  private measureINP(): void {
    onINP((metric) => {
      const values = this.buildInitialValues(metric)
      this.addIfPresent(values, 'event_time', metric.attribution.eventTime)

      const context = this.buildInitialContext(metric)
      this.addIfPresent(context, 'event_target', metric.attribution.eventTarget)
      this.addIfPresent(context, 'event_type', metric.attribution.eventType)
      this.addIfPresent(context, 'load_state', metric.attribution.loadState)

      this.pushMeasurement(values, context)
    })
  }

  private measureLCP(): void {
    onLCP((metric) => {
      const values = this.buildInitialValues(metric)
      this.addIfPresent(values, 'element_render_delay', metric.attribution.elementRenderDelay)
      this.addIfPresent(values, 'resource_load_delay', metric.attribution.resourceLoadDelay)
      this.addIfPresent(values, 'resource_load_time', metric.attribution.resourceLoadTime)
      this.addIfPresent(values, 'time_to_first_byte', metric.attribution.timeToFirstByte)

      const context = this.buildInitialContext(metric)
      this.addIfPresent(context, 'element', metric.attribution.element)

      this.pushMeasurement(values, context)
    })
  }

  private measureTTFB(): void {
    onTTFB((metric) => {
      const values = this.buildInitialValues(metric)
      this.addIfPresent(values, 'dns_time', metric.attribution.dnsTime)
      this.addIfPresent(values, 'connection_time', metric.attribution.connectionTime)
      this.addIfPresent(values, 'request_time', metric.attribution.requestTime)
      this.addIfPresent(values, 'waiting_time', metric.attribution.waitingTime)

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
