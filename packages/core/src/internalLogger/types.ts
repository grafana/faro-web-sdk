export interface InternalLogger {
  debug: Console['debug'];
  error: Console['error'];
  info: Console['info'];
  readonly prefix: string;
  warn: Console['warn'];
}
