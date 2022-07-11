export interface InternalLogger {
  error: Console['error'];
  info: Console['info'];
  prefix: string;
  warn: Console['warn'];
}
