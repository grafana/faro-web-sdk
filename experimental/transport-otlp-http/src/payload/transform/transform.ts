import type { IKeyValue } from '@opentelemetry/otlp-transformer';
import {
  SEMATTRS_ENDUSER_ID,
  SEMATTRS_EXCEPTION_MESSAGE,
  SEMATTRS_EXCEPTION_TYPE,
  SEMATTRS_HTTP_URL,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_TELEMETRY_SDK_LANGUAGE,
  SEMRESATTRS_TELEMETRY_SDK_NAME,
  SEMRESATTRS_TELEMETRY_SDK_VERSION,
  TELEMETRYSDKLANGUAGEVALUES_WEBJS,
} from '@opentelemetry/semantic-conventions';

import {
  EventEvent,
  ExceptionEvent,
  LogEvent,
  LogLevel,
  MeasurementEvent,
  Meta,
  TransportItem,
  TransportItemType,
  VERSION,
} from '@grafana/faro-core';
import type { InternalLogger, TraceEvent } from '@grafana/faro-core';

import type { OtlpHttpTransportOptions } from '../../types';
import { isAttribute, toAttribute, toAttributeValue } from '../attribute';

import type {
  LogRecord,
  LogsTransform,
  LogTransportItem,
  Resource,
  ResourceLog,
  ResourceMeta,
  ResourceSpan,
  ScopeLog,
  StringValueNonNullable,
  TraceTransform,
} from './types';

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

export function getLogTransforms(
  internalLogger: InternalLogger,
  customOtlpTransform?: OtlpHttpTransportOptions['otlpTransform']
): LogsTransform {
  function toResourceLog(transportItem: LogTransportItem): ResourceLog {
    const resource = toResource(transportItem);

    return {
      resource,
      scopeLogs: [toScopeLog(transportItem)],
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
    const body = toAttributeValue(payload.message) as StringValueNonNullable;

    function getSeverityProperties(logLevel: LogLevel) {
      switch (logLevel) {
        case LogLevel.TRACE:
          return { severityNumber: 1, severityText: 'TRACE' };
        case LogLevel.DEBUG:
          return { severityNumber: 5, severityText: 'DEBUG' };
        case LogLevel.INFO:
          return { severityNumber: 9, severityText: 'INFO' };
        case LogLevel.LOG:
          return { severityNumber: 10, severityText: 'INFO2' };
        case LogLevel.WARN:
          return { severityNumber: 13, severityText: 'WARN' };
        case LogLevel.ERROR:
          return { severityNumber: 17, severityText: 'ERROR' };
      }
    }

    return {
      timeUnixNano,
      ...getSeverityProperties(payload.level),
      body,
      attributes: [...getCommonLogAttributes(meta), toAttribute('faro.log.context', payload.context)].filter(
        isAttribute
      ),
      traceId: payload.trace?.trace_id,
      spanId: payload.trace?.span_id,
    } as const;
  }

  function toEventLogRecord(transportItem: TransportItem<EventEvent>): LogRecord {
    const { meta, payload } = transportItem;
    const timeUnixNano = toTimeUnixNano(payload.timestamp);
    const body = toAttributeValue(payload.name) as StringValueNonNullable;

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
      spanId: payload.trace?.span_id,
    } as const;
  }

  function toErrorLogRecord(transportItem: TransportItem<ExceptionEvent>): LogRecord {
    const { meta, payload } = transportItem;
    const timeUnixNano = toTimeUnixNano(payload.timestamp);
    const body = getCustomLogBody(transportItem, customOtlpTransform?.createErrorLogBody);

    return {
      timeUnixNano,
      ...(body ? { body } : {}),
      attributes: [
        ...getCommonLogAttributes(meta),
        toAttribute(SEMATTRS_EXCEPTION_TYPE, payload.type),
        toAttribute(SEMATTRS_EXCEPTION_MESSAGE, payload.value),
        // toAttribute(SemanticAttributes.EXCEPTION_STACKTRACE, undefined),
        toAttribute('faro.error.stacktrace', payload.stacktrace),
        toAttribute('faro.error.context', payload.context),
      ].filter(isAttribute),
      traceId: payload.trace?.trace_id,
      spanId: payload.trace?.span_id,
    } as const;
  }

  function toMeasurementLogRecord(transportItem: TransportItem<MeasurementEvent>): LogRecord {
    const { meta, payload } = transportItem;
    const timeUnixNano = toTimeUnixNano(payload.timestamp);
    const [measurementName, measurementValue] = Object.entries(payload.values).flat();

    const body = getCustomLogBody(transportItem, customOtlpTransform?.createMeasurementLogBody);

    return {
      timeUnixNano,
      ...(body ? { body } : {}),
      attributes: [
        ...getCommonLogAttributes(meta),
        toAttribute('measurement.type', payload.type),
        toAttribute('measurement.name', measurementName),
        toAttribute('measurement.value', measurementValue),
        toAttribute('faro.measurement.context', payload.context),
      ].filter(isAttribute),
      traceId: payload.trace?.trace_id,
      spanId: payload.trace?.span_id,
    } as const;
  }

  function getCommonLogAttributes(meta: Meta): IKeyValue[] {
    const { view, page, session, user } = meta;

    return [
      toAttribute('view.name', view?.name),
      toAttribute(SEMATTRS_HTTP_URL, page?.url),
      toAttribute('page.id', page?.id),
      toAttribute('page.attributes', page?.attributes),
      toAttribute('session.id', session?.id),
      toAttribute('session.attributes', session?.attributes),
      toAttribute(SEMATTRS_ENDUSER_ID, user?.id),
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

export function getTraceTransforms(_internalLogger?: InternalLogger): TraceTransform {
  function toResourceSpan(transportItem: TransportItem<TraceEvent>): ResourceSpan {
    const resource = toResource(transportItem);
    const scopeSpans = transportItem.payload.resourceSpans?.[0]?.scopeSpans;

    return {
      resource,
      scopeSpans: scopeSpans ?? [],
    };
  }

  return {
    toResourceSpan,
  };
}

function toResource(transportItem: TransportItem): Readonly<Resource> {
  const { browser, sdk, app }: ResourceMeta = transportItem.meta;

  return {
    attributes: [
      toAttribute(SemanticBrowserAttributes.BROWSER_MOBILE, browser?.mobile),
      toAttribute(SemanticBrowserAttributes.BROWSER_USER_AGENT, browser?.userAgent),
      toAttribute(SemanticBrowserAttributes.BROWSER_LANGUAGE, browser?.language),
      toAttribute(SemanticBrowserAttributes.BROWSER_BRANDS, browser?.brands),
      toAttribute('browser.os', browser?.os),
      toAttribute('browser.name', browser?.name),
      toAttribute('browser.version', browser?.version),
      toAttribute('browser.screen_width', browser?.viewportWidth),
      toAttribute('browser.screen_height', browser?.viewportHeight),

      toAttribute(SEMRESATTRS_TELEMETRY_SDK_NAME, sdk?.name),
      toAttribute(SEMRESATTRS_TELEMETRY_SDK_VERSION, sdk?.version),
      Boolean(sdk) ? toAttribute(SEMRESATTRS_TELEMETRY_SDK_LANGUAGE, TELEMETRYSDKLANGUAGEVALUES_WEBJS) : undefined,

      toAttribute(SEMRESATTRS_SERVICE_NAME, app?.name),
      toAttribute(SEMRESATTRS_SERVICE_VERSION, app?.version),
      toAttribute(SEMRESATTRS_DEPLOYMENT_ENVIRONMENT, app?.environment),
    ].filter(isAttribute),
  };
}

function getCustomLogBody<T>(
  transportItem: T,
  createCustomLogBody?: (item: T) => string
): StringValueNonNullable | undefined {
  return typeof createCustomLogBody === 'function'
    ? (toAttributeValue(createCustomLogBody(transportItem)) as StringValueNonNullable)
    : undefined;
}
