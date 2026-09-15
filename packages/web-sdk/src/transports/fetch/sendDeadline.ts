import { noop } from '@grafana/faro-core';

class SendTimeoutError extends Error {}

/** One lifetime for scheduling, preparation, delivery, and retry waits. */
export class SendDeadline {
  readonly signal: AbortSignal | undefined;
  private readonly expiresAt: number | undefined;
  private readonly controller = typeof AbortController === 'undefined' ? undefined : new AbortController();
  private readonly cancelled: Promise<never>;
  private rejectCancellation!: (reason: unknown) => void;
  private ended?: { reason: unknown };
  private timeout?: ReturnType<typeof setTimeout>;

  constructor(
    readonly startedAt: number,
    timeoutMs: number,
    private readonly getNow: () => number,
    private readonly callerSignal: AbortSignal | undefined
  ) {
    this.expiresAt = timeoutMs > 0 ? this.startedAt + timeoutMs : undefined;
    this.signal = this.controller?.signal ?? callerSignal;
    this.cancelled = new Promise<never>((_resolve, reject) => {
      this.rejectCancellation = reject;
    });
    void this.cancelled.catch(noop);
    callerSignal?.addEventListener('abort', this.abortFromCaller, { once: true });
    if (callerSignal?.aborted) {
      this.abortFromCaller();
    } else if (this.expiresAt != null) {
      this.timeout = setTimeout(
        () => this.cancel(new SendTimeoutError('Send deadline exceeded')),
        Math.max(0, this.expiresAt - getNow())
      );
    }
  }

  assertActive(): void {
    if (!this.ended && this.callerSignal?.aborted) {
      this.abortFromCaller();
    }
    if (!this.ended && this.expiresAt != null && this.getNow() >= this.expiresAt) {
      this.cancel(new SendTimeoutError('Send deadline exceeded'));
    }
    if (this.ended) {
      throw this.ended.reason;
    }
  }

  async run<T>(operation: () => T | PromiseLike<T>): Promise<T> {
    this.assertActive();
    const pending = Promise.resolve(operation());
    // A synchronous callback may cancel before the race is installed. Its
    // eventual rejection must still be observed when we abandon its result.
    void pending.catch(noop);
    this.assertActive();
    const value = await Promise.race([pending, this.cancelled]);
    this.assertActive();
    return value;
  }

  dispose(): void {
    this.cancel(new Error('Send completed'));
  }

  private readonly abortFromCaller = () => {
    this.cancel(this.callerSignal?.reason ?? new Error('Send cancelled'));
  };

  private cancel(reason: unknown): void {
    if (this.ended) {
      return;
    }
    this.ended = { reason };
    clearTimeout(this.timeout);
    this.callerSignal?.removeEventListener('abort', this.abortFromCaller);
    this.rejectCancellation(reason);
    this.controller?.abort(reason);
  }
}
