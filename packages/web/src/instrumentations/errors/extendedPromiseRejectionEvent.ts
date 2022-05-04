export interface ExtendedPromiseRejectionEvent extends PromiseRejectionEvent {
  detail?: {
    reason: PromiseRejectionEvent['reason'];
  };
}
