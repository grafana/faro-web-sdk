import type { IKeyValue } from '@opentelemetry/otlp-transformer';
import {
  SemanticAttributes,
  SemanticResourceAttributes,
  TelemetrySdkLanguageValues,
} from '@opentelemetry/semantic-conventions';

import {
  EventEvent,
  ExceptionEvent,
  LogEvent,
  MeasurementEvent,
  Meta,
  TransportItem,
  TransportItemType,
  VERSION,
} from '@grafana/faro-core';
import type { InternalLogger } from '@grafana/faro-core';

import { isAttribute, toAttribute, toAttributeValue } from '../attribute';

import type { LogRecord, LogsTransform, LogTransportItem, Resource, ResourceMeta, ScopeLog } from './types';

/**
 * Seems currently to be missing in the semantic-conventions npm package.
 * See: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/README.md#todos
 *
 * Attributes are as defined by the Otel docs
 */
const SemanticBrowserAttributes = {
  BROWSER_BRANDS: 'browser.brands',
  BROWSER_PLATFORM: 'browser.platform',
  BROWSER_MOBILE: 'browser.mobile',
  BROWSER_USER_AGENT: 'browser.user_agent',
  BROWSER_LANGUAGE: 'browser.language',
} as const;

export function initLogsTransform(internalLogger: InternalLogger): LogsTransform {
  function toResourceLog(transportItem: LogTransportItem) {
    const resource = toResource(transportItem);

    return {
      resource,
      scopeLogs: [toScopeLog(transportItem)],
    };
  }

  function toResource(transportItem: LogTransportItem): Readonly<Resource> {
    const { browser, sdk, app }: ResourceMeta = transportItem.meta;

    return {
      attributes: [
        toAttribute(SemanticBrowserAttributes.BROWSER_MOBILE, browser?.mobile),
        toAttribute(SemanticBrowserAttributes.BROWSER_USER_AGENT, browser?.userAgent),
        toAttribute(SemanticBrowserAttributes.BROWSER_LANGUAGE, browser?.language),
        toAttribute('browser.os', browser?.os),
        // toAttribute(SemanticBrowserAttributes.BROWSER_BRANDS, browser?.brands),
        toAttribute('browser.name', browser?.name),
        toAttribute('browser.version', browser?.version),

        toAttribute(SemanticResourceAttributes.TELEMETRY_SDK_NAME, sdk?.name),
        toAttribute(SemanticResourceAttributes.TELEMETRY_SDK_VERSION, sdk?.version),
        Boolean(sdk)
          ? toAttribute(SemanticResourceAttributes.TELEMETRY_SDK_LANGUAGE, TelemetrySdkLanguageValues.WEBJS)
          : undefined,

        toAttribute(SemanticResourceAttributes.SERVICE_NAME, app?.name),
        toAttribute(SemanticResourceAttributes.SERVICE_VERSION, app?.version),
        toAttribute(SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT, app?.environment),
      ].filter(isAttribute),
    };
  }

  function toScopeLog(transportItem: LogTransportItem): ScopeLog {
    return {
      scope: {
        name: '@grafana/faro-web-sdk',
        version: VERSION,
      },
      logRecords: [toLogRecord(transportItem)],
    };
  }

  function toLogRecord(transportItem: LogTransportItem): LogRecord {
    const { type } = transportItem;

    switch (type) {
      case TransportItemType.LOG:
        return toLogLogRecord(transportItem as TransportItem<LogEvent>);
      case TransportItemType.EXCEPTION:
        return toErrorLogRecord(transportItem as TransportItem<ExceptionEvent>);
      case TransportItemType.EVENT:
        return toEventLogRecord(transportItem as TransportItem<EventEvent>);
      case TransportItemType.MEASUREMENT:
        return toMeasurementLogRecord(transportItem as TransportItem<MeasurementEvent>);
      default:
        internalLogger?.error(`Unknown TransportItemType: ${type}`);
        return {};
    }
  }

  function toLogLogRecord(transportItem: TransportItem<LogEvent>): LogRecord {
    const { meta, payload } = transportItem;
    const timeUnixNano = toTimeUnixNano(payload.timestamp);
    const body = toAttributeValue(payload.message) as { stringValue: string; key: string };

    return {
      timeUnixNano,
      severityNumber: 10,
      severityText: 'INFO2',
      body,
      attributes: getCommonLogAttributes(meta),
      traceId: payload.trace?.trace_id,
      spanId: payload.trace?.trace_id,
    } as const;
  }

  function toEventLogRecord(transportItem: TransportItem<EventEvent>): LogRecord {
    const { meta, payload } = transportItem;
    const timeUnixNano = toTimeUnixNano(payload.timestamp);
    const body = toAttributeValue(payload.name) as { stringValue: string; key: string };

    return {
      timeUnixNano,
      body,
      attributes: [
        ...getCommonLogAttributes(meta),
        toAttribute('event.name', payload.name), // This is a semantic attribute. But event.name constant is currently missing in sematic-conventions npm package
        toAttribute('event.domain', payload.domain), // This is a semantic attribute. But event.domain constant is currently missing in sematic-conventions npm package
        toAttribute('event.attributes', payload.attributes),
      ].filter(isAttribute),
      traceId: payload.trace?.trace_id,
      spanId: payload.trace?.trace_id,
    } as const;
  }

  function toErrorLogRecord(transportItem: TransportItem<ExceptionEvent>): LogRecord {
    const { meta, payload } = transportItem;
    const timeUnixNano = toTimeUnixNano(payload.timestamp);

    return {
      timeUnixNano,
      attributes: [
        ...getCommonLogAttributes(meta),
        toAttribute(SemanticAttributes.EXCEPTION_TYPE, payload.type),
        toAttribute(SemanticAttributes.EXCEPTION_MESSAGE, payload.value),
        // toAttribute(SemanticAttributes.EXCEPTION_STACKTRACE, undefined),
        toAttribute('faro.error.stacktrace', payload.stacktrace),
      ].filter(isAttribute),
      traceId: payload.trace?.trace_id,
      spanId: payload.trace?.trace_id,
    } as const;
  }

  function toMeasurementLogRecord(transportItem: TransportItem<MeasurementEvent>): LogRecord {
    const { meta, payload } = transportItem;
    const timeUnixNano = toTimeUnixNano(payload.timestamp);
    const [measurementName, measurementValue] = Object.entries(payload.values).flat();

    return {
      timeUnixNano,
      attributes: [
        ...getCommonLogAttributes(meta),
        toAttribute('measurement.type', payload.type),
        toAttribute('measurement.name', measurementName),
        toAttribute('measurement.value', measurementValue),
      ].filter(isAttribute),
      traceId: payload.trace?.trace_id,
      spanId: payload.trace?.trace_id,
    } as const;
  }

  function getCommonLogAttributes(meta: Meta): IKeyValue[] {
    const { view, page, session, user } = meta;

    return [
      toAttribute('view.name', view?.name),
      toAttribute(SemanticAttributes.HTTP_URL, page?.url),
      toAttribute('page.id', page?.id),
      toAttribute('page.attributes', page?.attributes),
      toAttribute('session.id', session?.id),
      toAttribute('session.attributes', session?.attributes),
      toAttribute(SemanticAttributes.ENDUSER_ID, user?.id),
      toAttribute('enduser.name', user?.username),
      toAttribute('enduser.email', user?.email),
      toAttribute('enduser.attributes', user?.attributes),
    ].filter(isAttribute);
  }

  function toTimeUnixNano(timestamp: string): number {
    return Date.parse(timestamp) * 1e6;
  }

  return {
    toResourceLog,
    toScopeLog,
    toLogRecord,
  };
}
