/**
 * Interface used to provide information to finish span on fetch error
 */
export interface FetchError {
  status?: number;
  message: string;
}

export interface FetchInstrumentationOptions {
  // For these URLs no events will be tracked
  ignoredUrls?: Array<string | RegExp>;
}
