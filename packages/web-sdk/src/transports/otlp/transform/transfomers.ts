import {
  EventEvent,
  ExceptionEvent,
  LogEvent,
  MeasurementEvent,
  Meta,
  TransportItem,
  TransportItemType,
} from '@grafana/faro-core';
import { SemanticAttributes, TelemetrySdkLanguageValues } from '@opentelemetry/semantic-conventions';
import { internalLogger } from '../otlpPayloadLogger';

import { AttributeValueType, toAttribute, toNestedAttributes } from './attributeUtils';
import { faroResourceAttributes, sematicAttributes as semanticAttributes } from './semanticResourceAttributes';
import type {
  Attribute,
  EventLogRecordPayload,
  FaroResourceAttributes,
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
      toAttribute(faroResourceAttributes.BROWSER_MOBILE, browser?.mobile, AttributeValueType.BOOL),
      toAttribute(faroResourceAttributes.BROWSER_NAME, browser?.name),
      toAttribute(faroResourceAttributes.BROWSER_PLATFORM, browser?.os),
      toAttribute(faroResourceAttributes.BROWSER_VERSION, browser?.version),

      toAttribute(faroResourceAttributes.TELEMETRY_SDK_NAME, sdk?.name),
      toAttribute(faroResourceAttributes.TELEMETRY_SDK_VERSION, sdk?.version),
      // TODO: Q; do we want to add this? Is webjs the correct value (also ask the otel team)
      Boolean(sdk)
        ? toAttribute(faroResourceAttributes.TELEMETRY_SDK_LANGUAGE, TelemetrySdkLanguageValues.WEBJS)
        : undefined,

      toAttribute(faroResourceAttributes.SERVICE_NAME, app?.name),
      toAttribute(faroResourceAttributes.SERVICE_VERSION, app?.version),
      toAttribute(faroResourceAttributes.DEPLOYMENT_ENVIRONMENT, app?.environment),
      toAttribute(faroResourceAttributes.APP_RELEASE, app?.release),
    ].filter((item): item is Attribute<FaroResourceAttributes> => Boolean(item)),
    droppedAttributesCount: 0,
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
  const timeUnixNano = Date.parse(payload.timestamp) * 1e6;

  return {
    timeUnixNano,
    observedTimeUnixNano: timeUnixNano,
    severityNumber: 10,
    severityText: 'INFO2',
    body: { [AttributeValueType.STRING]: payload.message },
    attributes: getCommonLogAttributes(meta), // TODO: Q: will context also be converted to attributes?
    traceId: payload.trace?.trace_id,
    spanId: payload.trace?.trace_id,
    droppedAttributesCount: 0,
  } as const;
}

function getEventLogRecord(transportItem: TransportItem<EventEvent>): EventLogRecordPayload {
  const { meta, payload } = transportItem;
  const timeUnixNano = Date.parse(payload.timestamp) * 1e6;

  return {
    timeUnixNano,
    observedTimeUnixNano: timeUnixNano,
    severityNumber: 1,
    severityText: 'TRACE',
    body: { [AttributeValueType.STRING]: payload.name },
    attributes: [
      ...getCommonLogAttributes(meta),
      toAttribute(semanticAttributes.FARO_EVENT, true, AttributeValueType.BOOL),
      toAttribute(semanticAttributes.EVENT_NAME, payload.name),
      toAttribute(semanticAttributes.EVENT_DOMAIN, payload.domain),
      toNestedAttributes('event.attributes', payload.attributes),
    ].filter((item): item is Attribute<any> => Boolean(item)),
    traceId: payload.trace?.trace_id,
    spanId: payload.trace?.trace_id,
    droppedAttributesCount: 0,
  } as const;
}

// TODO remove _ prefix after implementation
function getErrorLogRecord(_transportItem: TransportItem<ExceptionEvent>) {
  // TODO: implement
  return {};
}

// TODO remove _ prefix after implementation
function getMeasurementLogRecord(_transportItem: TransportItem<MeasurementEvent>) {
  // TODO: implement
  return {};
}

function getCommonLogAttributes(meta: Meta): Attribute<unknown>[] {
  const { view, page, session, user } = meta;

  return [
    toAttribute(semanticAttributes.VIEW_NAME, view?.name),
    toAttribute(SemanticAttributes.HTTP_URL, page?.url),
    toAttribute(faroResourceAttributes.SESSION_ID, session?.id),
    toNestedAttributes(faroResourceAttributes.SESSION_ATTRIBUTES, session?.attributes),
    toAttribute(faroResourceAttributes.ENDUSER_ID, user?.id),
    toAttribute(faroResourceAttributes.ENDUSER_NAME, user?.username),
    toAttribute(faroResourceAttributes.ENDUSER_EMAIL, user?.email),
    toNestedAttributes(faroResourceAttributes.ENDUSER_ATTRIBUTES, user?.attributes),
  ].filter((item): item is Attribute<any> => Boolean(item));
}
