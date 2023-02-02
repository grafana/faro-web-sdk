import {
  EventEvent,
  ExceptionEvent,
  LogEvent,
  MeasurementEvent,
  Meta,
  TransportItem,
  TransportItemType,
} from '@grafana/faro-core';
import {
  SemanticAttributes,
  SemanticResourceAttributes,
  TelemetrySdkLanguageValues,
} from '@opentelemetry/semantic-conventions';
import { internalLogger } from '../otlpPayloadLogger';
import { Attribute, isAttribute, toAttribute, toAttributeValue } from './attributes';

import {
  faroResourceAttributes,
  SemanticBrowserAttributes,
  sematicAttributes as semanticAttributes,
} from './semanticResourceAttributes';
import type {
  ErrorLogRecordPayload,
  EventLogRecordPayload,
  LogLogRecordPayload,
  LogTransportItem,
  ResourcePayload,
  ScopeLog,
} from './types';

export function getResourceLogPayload(transportItem: LogTransportItem) {
  const resource = getResource(transportItem);

  return {
    resource,
    scopeLogs: [getScopeLog(transportItem)],
  };
}

function getResource(transportItem: LogTransportItem): Readonly<ResourcePayload> {
  const { browser, sdk, app } = transportItem.meta;

  return {
    attributes: [
      toAttribute(SemanticBrowserAttributes.BROWSER_MOBILE, browser?.mobile),
      toAttribute(SemanticBrowserAttributes.BROWSER_USER_AGENT, undefined),
      // toAttribute(SemanticBrowserAttributes.BROWSER_PLATFORM, browser?.os),
      // toAttribute(SemanticBrowserAttributes.BROWSER_BRANDS, browser?.brands),
      toAttribute(faroResourceAttributes.BROWSER_NAME, browser?.name),
      toAttribute(faroResourceAttributes.BROWSER_VERSION, browser?.version),

      toAttribute(SemanticResourceAttributes.TELEMETRY_SDK_NAME, sdk?.name),
      toAttribute(SemanticResourceAttributes.TELEMETRY_SDK_VERSION, sdk?.version),
      Boolean(sdk)
        ? toAttribute(SemanticResourceAttributes.TELEMETRY_SDK_LANGUAGE, TelemetrySdkLanguageValues.WEBJS)
        : undefined,

      toAttribute(SemanticResourceAttributes.SERVICE_NAME, app?.name),
      toAttribute(SemanticResourceAttributes.SERVICE_VERSION, app?.version),
      toAttribute(SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT, app?.environment),
      toAttribute(faroResourceAttributes.APP_RELEASE, app?.release),
    ].filter(isAttribute),
  };
}

export function getScopeLog(transportItem: LogTransportItem): ScopeLog {
  return {
    scope: {
      name: '@grafana/faro-core',
      version: '1.0.0-beta4',
    },
    logRecords: [getLogRecord(transportItem)],
  };
}

function getLogRecord(transportItem: LogTransportItem) {
  const { type } = transportItem;

  switch (type) {
    case TransportItemType.LOG:
      return getLogLogRecord(transportItem as TransportItem<LogEvent>);
    case TransportItemType.EXCEPTION:
      return getErrorLogRecord(transportItem as TransportItem<ExceptionEvent>);
    case TransportItemType.EVENT:
      return getEventLogRecord(transportItem as TransportItem<EventEvent>);
    case TransportItemType.MEASUREMENT:
      return getMeasurementLogRecord(transportItem as TransportItem<MeasurementEvent>);
    default:
      internalLogger.error(`Unknown TransportItemType: ${type}`);
      return;
  }
}

function getLogLogRecord(transportItem: TransportItem<LogEvent>): LogLogRecordPayload {
  const { meta, payload } = transportItem;
  const timeUnixNano = getTimeUnixNano(payload.timestamp);
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

function getEventLogRecord(transportItem: TransportItem<EventEvent>): EventLogRecordPayload {
  const { meta, payload } = transportItem;
  const timeUnixNano = getTimeUnixNano(payload.timestamp);
  const body = toAttributeValue(payload.name) as { stringValue: string; key: string };

  return {
    timeUnixNano,
    body,
    attributes: [
      ...getCommonLogAttributes(meta),
      toAttribute(semanticAttributes.EVENT_NAME, payload.name),
      toAttribute(semanticAttributes.EVENT_DOMAIN, payload.domain),
      toAttribute('event.attributes', payload.attributes),
    ].filter((item): item is Attribute => Boolean(item)),
    traceId: payload.trace?.trace_id,
    spanId: payload.trace?.trace_id,
  } as const;
}

function getErrorLogRecord(transportItem: TransportItem<ExceptionEvent>): ErrorLogRecordPayload {
  const { meta, payload } = transportItem;
  const timeUnixNano = getTimeUnixNano(payload.timestamp);

  return {
    timeUnixNano,
    attributes: [
      ...getCommonLogAttributes(meta),
      toAttribute(SemanticAttributes.EXCEPTION_TYPE, payload.type),
      toAttribute(SemanticAttributes.EXCEPTION_MESSAGE, payload.value),
      // toAttribute(SemanticAttributes.EXCEPTION_STACKTRACE, undefined), // TODO: currently we don't have the value yet in teh respective payload
      toAttribute('faro.error.stacktrace', payload.stacktrace),
    ].filter(isAttribute),
    traceId: payload.trace?.trace_id,
    spanId: payload.trace?.trace_id,
  } as const;
}

// TODO remove _ prefix after implementation
function getMeasurementLogRecord(_transportItem: TransportItem<MeasurementEvent>) {
  // TODO: implement
  return {};
}

function getCommonLogAttributes(meta: Meta): Attribute[] {
  const { view, page, session, user } = meta;

  return [
    toAttribute(semanticAttributes.VIEW_NAME, view?.name),
    toAttribute(SemanticAttributes.HTTP_URL, page?.url),
    toAttribute(faroResourceAttributes.PAGE_ID, page?.id),
    toAttribute(faroResourceAttributes.PAGE_ATTRIBUTES, page?.attributes),
    toAttribute(faroResourceAttributes.SESSION_ID, session?.id),
    toAttribute(faroResourceAttributes.SESSION_ATTRIBUTES, session?.attributes),
    toAttribute(SemanticAttributes.ENDUSER_ID, user?.id),
    toAttribute(faroResourceAttributes.ENDUSER_NAME, user?.username),
    toAttribute(faroResourceAttributes.ENDUSER_EMAIL, user?.email),
    toAttribute(faroResourceAttributes.ENDUSER_ATTRIBUTES, user?.attributes),
  ].filter(isAttribute);
}

function getTimeUnixNano(timestamp: string): number {
  return Date.parse(timestamp) * 1e6;
}
