import type { Config } from '@grafana/faro-core';

export interface BrowserConfig extends Partial<Omit<Config, 'app' | 'parseStacktrace'>>, Pick<Config, 'app'> {
  url?: string;
  apiKey?: string;
  requestCompression?: boolean;
  /**
   * Opt-in remote configuration. When provided, the SDK fetches a per-app config (currently the
   * session sampling rate) from the collector and applies it to the current session via the
   * defer-and-buffer lifecycle. When omitted, initialization behavior is unchanged.
   */
  remoteConfig?: RemoteConfigOptions;
}

export interface RemoteConfigOptions {
  /**
   * Base URL of the remote-config endpoint (same host as the collector). The SDK requests
   * `${url}/config/${appKey}`. When omitted, it is derived from the collector `url`
   * (the `/collect/{appKey}` URL) by swapping `/collect` for `/config`.
   */
  url?: string;
  /**
   * Hard timeout (ms) for the cold-cache fetch before the SDK finalizes the sampling decision with
   * the cached/bundled default (default: 1500).
   */
  timeoutMs?: number;
  /**
   * Maximum total byte size of buffered telemetry before the SDK finalizes early as "sampled"
   * (keep) and flushes, bounding host-page memory (default: 65536 / 64KB).
   */
  maxBufferBytes?: number;
}

export interface GetWebInstrumentationsOptions {
  captureConsole?: boolean;
  enablePerformanceInstrumentation?: boolean;
  enableContentSecurityPolicyInstrumentation?: boolean;
}
