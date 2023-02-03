import {
  EventEvent,
  ExceptionEvent,
  LogEvent,
  MeasurementEvent,
  Meta,
  TransportItem,
  TransportItemType,
  VERSION as SDK_VERSION,
} from '@grafana/faro-core';
import {
  SemanticAttributes,
  SemanticResourceAttributes,
  TelemetrySdkLanguageValues,
} from '@opentelemetry/semantic-conventions';
import { internalLogger } from '../../otlpPayloadLogger';
import { Attribute, isAttribute, toAttribute, toAttributeValue } from '../attribute';
import type {
  LogTransportItem,
  ResourcePayload,
  ScopeLog,
  LogLogRecordPayload,
  EventLogRecordPayload,
  ErrorLogRecordPayload,
} from './types';

/**
 * Seems currently to be missing in the semantic-conventions npm package.
 * See: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/README.md#todos
 *
 * Took the few attributes as defined in the docs
 */
const SemanticBrowserAttributes = {
  BROWSER_BRANDS: 'browser.brands', // TODO: Q: shall we add this to meta.ts => navigator.userAgentData.brands. !The spec is still experimental!
  BROWSER_PLATFORM: 'browser.platform',
  BROWSER_MOBILE: 'browser.mobile',
  BROWSER_USER_AGENT: 'browser.user_agent', // TODO: Q: shall we add this to meta.ts => parser.getUA()
  BROWSER_LANGUAGE: 'browser.language', // TODO: Q: shall we add this to meta.ts => window.navigator.language
} as const;

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
      toAttribute(SemanticBrowserAttributes.BROWSER_USER_AGENT, browser?.userAgent),
      toAttribute(SemanticBrowserAttributes.BROWSER_LANGUAGE, browser?.language),
      toAttribute('browser.os', browser?.os),
      // toAttribute(SemanticBrowserAttributes.BROWSER_BRANDS, browser?.brands), // TODO: shall we provide this to browser which already support Navigator.userAgentData an
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

export function getScopeLog(transportItem: LogTransportItem): ScopeLog {
  return {
    scope: {
      name: '@grafana/faro-web-sdk',
      version: SDK_VERSION,
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
      toAttribute('event.name', payload.name), // event.name constant is currently missing in sematic-conventions npm package
      toAttribute('event.domain', payload.domain), // event.domain constant is currently missing in sematic-conventions npm package
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
      // toAttribute(SemanticAttributes.EXCEPTION_STACKTRACE, undefined), // TODO: currently we don't have the value yet in the respective payload. Will be done in a separate PR
      toAttribute('error.stacktrace', payload.stacktrace),
    ].filter(isAttribute),
    traceId: payload.trace?.trace_id,
    spanId: payload.trace?.trace_id,
  } as const;
}

// TODO: finiosh after we agreed on data structure
function getMeasurementLogRecord(transportItem: TransportItem<MeasurementEvent>) {
  const { meta, payload } = transportItem;
  // const timeUnixNano = getTimeUnixNano(payload);

  return {
    // timeUnixNano,
    attributes: [
      ...getCommonLogAttributes(meta),
      toAttribute('measurement.type', payload.type),
      toAttribute('measurement.name', undefined),
      toAttribute('measurement.values', payload.values),
    ].filter(isAttribute),
    traceId: payload.trace?.trace_id,
    spanId: payload.trace?.trace_id,
  } as const;
}

function getCommonLogAttributes(meta: Meta): Attribute[] {
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

function getTimeUnixNano(timestamp: string): number {
  return Date.parse(timestamp) * 1e6;
}
