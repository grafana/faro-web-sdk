export interface BatchTransportOptions {
  // If no new signal arrives after "batchSendTimeout" ms, send the payload. If set to 0, timeout is disabled
  readonly batchSendTimeout?: number;
  // Buffer "batchSendCount" signals before sending the payload
  readonly batchSendCount?: number;
}
