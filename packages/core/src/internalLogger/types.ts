export interface InternalLogger {
  debug: Console['debug'];
  error: Console['error'];
  info: Console['info'];
  prefix: string;
  warn: Console['warn'];
}
