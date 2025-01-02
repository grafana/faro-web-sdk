export type WebSocketMessage<T = Record<string, unknown>> = T;

export type MessageTransform<T = Record<string, unknown>> = (
  message: WebSocketMessage<T>
) => WebSocketMessage<T> | null | undefined;

export interface WebSocketInstrumentationConfig<T = Record<string, unknown>> {
  messageTransform?: MessageTransform<T>;
  sendTransform?: MessageTransform<T>;
}

export interface PendingRequest {
  span: import('@opentelemetry/api').Span;
  startTime: number;
}
