export interface SessionRecordingInstrumentationOptions {
  /**
   * Whether to mask all inputs
   * @default false
   */
  maskAllInputs?: boolean;

  /**
   * Whether to mask text inputs
   * @default { password: true }
   */
  maskInputOptions?: MaskInputOptions;

  /**
   * Custom CSS selector to mask elements
   * @default undefined
   */
  maskSelector?: string;

  /**
   * Whether to block specified CSS selectors
   * @default undefined
   */
  blockSelector?: string;

  /**
   * Whether to ignore specified CSS selectors
   * @default undefined
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
   * Whether to record cross-origin iframes
   * @default false
   */
  recordCrossOriginIframes?: boolean;

  /**
   * Custom hook to transform events before they are sent
   */
  beforeSend?: (event: any) => any;
}

export type MaskInputOptions = Partial<{
  color: boolean;
  date: boolean;
  'datetime-local': boolean;
  email: boolean;
  month: boolean;
  number: boolean;
  range: boolean;
  search: boolean;
  tel: boolean;
  text: boolean;
  time: boolean;
  url: boolean;
  week: boolean;
  textarea: boolean;
  select: boolean;
  password: boolean;
}>;
