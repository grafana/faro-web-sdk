export interface BatchTransportOptions {
  // If no new signal arrives after "batchSendTimeout" ms, send the payload
  readonly batchSendTimeout?: number;
  // Buffer "batchSendCount" signals before sending the payload
  readonly batchSendCount?: number;
  // Force to send batches after "batchSendTimeout" ms. If set to 0, force timeout is disabled
  readonly batchForceSendTimeout?: number;
}
