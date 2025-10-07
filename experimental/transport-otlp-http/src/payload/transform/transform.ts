import type { IKeyValue } from '@opentelemetry/otlp-transformer/build/src/common/internal-types';
import {
  ATTR_EXCEPTION_MESSAGE,
  ATTR_EXCEPTION_TYPE,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_TELEMETRY_SDK_LANGUAGE,
  ATTR_TELEMETRY_SDK_NAME,
  ATTR_TELEMETRY_SDK_VERSION,
  ATTR_URL_FULL,
  ATTR_USER_AGENT_ORIGINAL,
  TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS,
} from '@opentelemetry/semantic-conventions';

import { LogLevel, TransportItemType, VERSION } from '@grafana/faro-core';
import type {
  EventEvent,
  ExceptionEvent,
  InternalLogger,
  LogEvent,
  MeasurementEvent,
  Meta,
  TraceEvent,
  TransportItem,
} from '@grafana/faro-core';

import {
  ATTR_BROWSER_BRANDS,
  ATTR_BROWSER_LANGUAGE,
  ATTR_BROWSER_MOBILE,
  ATTR_BROWSER_PLATFORM,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAMESPACE,
  ATTR_SESSION_ID,
  ATTR_USER_ATTRIBUTES,
  ATTR_USER_EMAIL,
  ATTR_USER_FULL_NAME,
  ATTR_USER_HASH,
  ATTR_USER_ID,
  ATTR_USER_NAME,
  ATTR_USER_ROLES,
} from '../../semconv';
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
        toAttribute(ATTR_EXCEPTION_TYPE, payload.type),
        toAttribute(ATTR_EXCEPTION_MESSAGE, payload.value),
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
      toAttribute(ATTR_URL_FULL, page?.url),
      toAttribute('page.id', page?.id),
      toAttribute('page.attributes', page?.attributes),
      toAttribute(ATTR_SESSION_ID, session?.id),
      toAttribute('session.attributes', session?.attributes),
      toAttribute(ATTR_USER_ID, user?.id),
      toAttribute(ATTR_USER_NAME, user?.username),
      toAttribute(ATTR_USER_EMAIL, user?.email),
      toAttribute(ATTR_USER_FULL_NAME, user?.fullName),
      toAttribute(ATTR_USER_ROLES, user?.roles),
      toAttribute(ATTR_USER_HASH, user?.hash),
      toAttribute(ATTR_USER_ATTRIBUTES, user?.attributes),
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
      toAttribute(ATTR_BROWSER_MOBILE, browser?.mobile),
      toAttribute(ATTR_USER_AGENT_ORIGINAL, browser?.userAgent),
      toAttribute(ATTR_BROWSER_LANGUAGE, browser?.language),
      toAttribute(ATTR_BROWSER_BRANDS, browser?.brands),
      toAttribute(ATTR_BROWSER_PLATFORM, browser?.os),
      toAttribute('browser.name', browser?.name),
      toAttribute('browser.version', browser?.version),
      toAttribute('browser.screen_width', browser?.viewportWidth),
      toAttribute('browser.screen_height', browser?.viewportHeight),

      toAttribute(ATTR_TELEMETRY_SDK_NAME, sdk?.name),
      toAttribute(ATTR_TELEMETRY_SDK_VERSION, sdk?.version),
      sdk ? toAttribute(ATTR_TELEMETRY_SDK_LANGUAGE, TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS) : undefined,

      toAttribute(ATTR_SERVICE_NAME, app?.name),
      toAttribute(ATTR_SERVICE_VERSION, app?.version),
      toAttribute(ATTR_SERVICE_NAMESPACE, app?.namespace),
      toAttribute(ATTR_DEPLOYMENT_ENVIRONMENT_NAME, app?.environment),
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
