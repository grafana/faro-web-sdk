export interface ExtendedError extends Error {
  columnNumber?: number;
  framesToPop?: number;
  stacktrace?: Error['stack'];
}
