export interface ExtendedPromiseRejectionEvent extends PromiseRejectionEvent {
  detail?: {
    reason: PromiseRejectionEvent['reason'];
  };
}

export type ErrorEvent = (Error | Event) & {
  error?: Error;
};
