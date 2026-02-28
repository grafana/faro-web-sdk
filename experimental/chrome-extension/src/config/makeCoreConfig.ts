import {
  createInternalLogger,
  defaultBatchingConfig,
  defaultGlobalObjectKey,
  defaultInternalLoggerLevel,
  defaultLogArgsSerializer,
  defaultUnpatchedConsole,
} from '@grafana/faro-core';
import type { Config, Transport } from '@grafana/faro-core';
import { FetchTransport, parseStacktrace } from '@grafana/faro-web-sdk';

import { extensionMeta, sdkMeta } from '../metas';

import { getExtensionInstrumentations } from './getExtensionInstrumentations';
import { detectExtensionContext } from './detectContext';
import type { ChromeExtensionConfig } from './types';

export function makeCoreConfig(extensionConfig: ChromeExtensionConfig): Config {
  const transports: Transport[] = [];

  const internalLogger = createInternalLogger(extensionConfig.unpatchedConsole, extensionConfig.internalLoggerLevel);

  if (extensionConfig.transports) {
    if (extensionConfig.url || extensionConfig.apiKey) {
      internalLogger.error('if "transports" is defined, "url" and "apiKey" should not be defined');
    }

    transports.push(...extensionConfig.transports);
  } else if (extensionConfig.url) {
    transports.push(
      new FetchTransport({
        url: extensionConfig.url,
        apiKey: extensionConfig.apiKey,
      })
    );
  } else {
    internalLogger.error('"url" or "transports" must be defined');
  }

  const context = extensionConfig.extensionContext ?? detectExtensionContext();

  const {
    dedupe = true,
    globalObjectKey = defaultGlobalObjectKey,
    instrumentations = getExtensionInstrumentations(context, extensionConfig.tracingOptions),
    internalLoggerLevel = defaultInternalLoggerLevel,
    isolate = false,
    logArgsSerializer = defaultLogArgsSerializer,
    metas = [extensionMeta, sdkMeta],
    paused = false,
    preventGlobalExposure = false,
    unpatchedConsole = defaultUnpatchedConsole,
    url: extensionConfigUrl,
    extensionContext,
    apiKey,
    tracingOptions: _tracingOptions,
    ...restProperties
  }: ChromeExtensionConfig = extensionConfig;

  return {
    ...restProperties,

    batching: {
      ...defaultBatchingConfig,
      ...extensionConfig.batching,
    },
    dedupe,
    globalObjectKey,
    instrumentations,
    internalLoggerLevel,
    isolate,
    logArgsSerializer,
    metas,
    parseStacktrace,
    paused,
    preventGlobalExposure,
    transports,
    unpatchedConsole,
    eventDomain: extensionConfig.eventDomain ?? 'chrome-extension',
    ignoreUrls: [
      ...(extensionConfig.ignoreUrls ?? []),
      ...(extensionConfigUrl ? [extensionConfigUrl] : []),
      /\/collect(?:\/[\w]*)?$/,
    ],
    sessionTracking: {
      enabled: true,
      persistent: true,
      ...extensionConfig.sessionTracking,
    },
  };
}
