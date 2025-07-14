export interface SessionRecordingInstrumentationOptions {
  /**
   * Maximum number of events to batch before sending
   * @default 100
   */
  batchSize?: number;

  /**
   * Maximum time to wait before sending a batch (in milliseconds)
   * @default 10000
   */
  batchTimeout?: number;

  /**
   * Whether to enable sampling for session recording
   * @default false
   */
  sampling?: boolean;

  /**
   * Sampling rate (0-1) when sampling is enabled
   * @default 0.1
   */
  samplingRate?: number;

  /**
   * Whether to record cross-origin iframes
   * @default false
   */
  recordCrossOriginIframes?: boolean;

  /**
   * Whether to mask text inputs
   * @default true
   */
  maskTextInputs?: boolean;

  /**
   * Whether to mask all inputs
   * @default false
   */
  maskAllInputs?: boolean;

  /**
   * Whether to mask all text
   * @default false
   */
  maskAllText?: boolean;

  /**
   * Custom CSS selector to mask elements
   */
  maskSelector?: string;

  /**
   * Whether to block specified CSS selectors
   * @default false
   */
  blockSelector?: string;

  /**
   * Whether to ignore specified CSS selectors
   * @default false
   */
  ignoreSelector?: string;

  /**
   * Whether to collect fonts
   * @default false
   */
  collectFonts?: boolean;

  /**
   * Whether to inline images
   * @default false
   */
  inlineImages?: boolean;

  /**
   * Whether to inline stylesheets
   * @default false
   */
  inlineStylesheet?: boolean;

  /**
   * Whether to record canvas
   * @default false
   */
  recordCanvas?: boolean;

  /**
   * Whether to record logs
   * @default false
   */
  recordLogs?: boolean;

  /**
   * Custom hook to filter events before they are recorded
   */
  beforeRecord?: (event: any) => boolean;

  /**
   * Custom hook to transform events before they are sent
   */
  beforeSend?: (event: any) => any;
}
