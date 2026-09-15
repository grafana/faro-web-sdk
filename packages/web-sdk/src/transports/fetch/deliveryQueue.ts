export interface RetryPolicy {
  maxAttempts: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
}

export interface DeliveryFailure {
  error?: unknown;
  status?: number;
}

export type AttemptOutcome =
  | { kind: 'success'; attemptsMade: number }
  | { kind: 'retry'; failure: DeliveryFailure; attemptsMade: number; retryAfterMs?: number }
  | { kind: 'terminal'; failure: DeliveryFailure; attemptsMade: number };

export interface DeliveryOutcome {
  kind: 'success' | 'terminal';
  attempts: number;
  failure?: DeliveryFailure;
  reason?: 'retries-exhausted' | 'retry-after-too-long';
}

export type PerformAttempt = (attemptsRemaining: number, unloading: boolean) => Promise<AttemptOutcome>;

export interface DeliveryQueueOptions {
  bufferSize: number;
  concurrency: number;
  retry: RetryPolicy;
  getNow: () => number;
  getRandom: () => number;
  onRetry?: (delayMs: number, nextAttempt: number) => void;
}

interface WaitingDelivery {
  sequence: number;
  readyAt: number;
  resolve: (unloading: boolean) => void;
}

interface QueuedAttempt {
  run: () => void;
  isRedelivery: boolean;
}

interface DeliveryLifetime {
  phase: 'reserved' | 'delivering' | 'released';
  cancel?: () => void;
}

export interface DeliveryReservation {
  deliver: (performAttempt: PerformAttempt) => Promise<DeliveryOutcome>;
  release: () => void;
}

/**
 * Bounded delivery admission, retry scheduling, and throttling.
 *
 * A reservation counts against `bufferSize` for its full delivery lifecycle, including backoff and
 * redelivery. A batch that waits for redelivery therefore continues to occupy one admission slot.
 * When all slots are occupied, the queue declines new batches and keeps the batches it already
 * accepted. The concurrency limit separately controls how many attempts can execute at one time.
 *
 * The caller owns the reservation and must release it in a `finally` block after preparation and
 * delivery finish. Release cancels queued, waiting, or active work and ignores its late result.
 * It is idempotent so cleanup remains safe on every exit path. This module
 * deliberately has no dependency on Fetch so another transport can supply its own single-attempt
 * callback.
 */
export class ReliableDeliveryQueue {
  private admitted = 0;
  private inProgress = 0;
  private sequence = 0;
  private nextSendAt = 0;
  private readonly attemptQueue: QueuedAttempt[] = [];
  private readonly waiting: WaitingDelivery[] = [];
  private redeliveryTimer?: ReturnType<typeof setTimeout>;
  private waitingTimer?: ReturnType<typeof setTimeout>;
  private unloading = false;

  constructor(private readonly options: DeliveryQueueOptions) {}

  reserve(): DeliveryReservation | undefined {
    if (this.admitted >= this.options.bufferSize) {
      return undefined;
    }

    this.admitted++;
    const sequence = this.sequence++;
    const lifetime: DeliveryLifetime = { phase: 'reserved' };

    const release = () => {
      if (lifetime.phase === 'released') {
        return;
      }
      lifetime.phase = 'released';
      this.admitted--;
      lifetime.cancel?.();
    };

    return {
      deliver: async (performAttempt) => {
        if (lifetime.phase !== 'reserved') {
          throw new Error('Delivery reservation already used or released');
        }
        lifetime.phase = 'delivering';
        let attempts = 0;
        let failure: DeliveryFailure | undefined;

        for (;;) {
          const attemptsRemaining = this.options.retry.maxAttempts - attempts;
          const outcome = await this.runAttempt(
            () => performAttempt(attemptsRemaining, this.unloading),
            lifetime,
            attempts > 0
          );
          this.assertActive(lifetime);
          attempts += outcome.attemptsMade;

          if (outcome.kind === 'success') {
            return { kind: 'success', attempts };
          }
          failure = outcome.failure;
          if (outcome.kind === 'terminal' || this.unloading) {
            return {
              kind: 'terminal',
              attempts,
              failure,
            };
          }
          if (attempts >= this.options.retry.maxAttempts) {
            return {
              kind: 'terminal',
              attempts,
              failure,
              reason: 'retries-exhausted',
            };
          }
          if (outcome.retryAfterMs != null && outcome.retryAfterMs > this.options.retry.maxBackoffMs) {
            return {
              kind: 'terminal',
              attempts,
              failure,
              reason: 'retry-after-too-long',
            };
          }

          const backoff = Math.min(
            outcome.retryAfterMs ??
              this.options.retry.initialBackoffMs * this.options.retry.backoffMultiplier ** (attempts - 1),
            this.options.retry.maxBackoffMs
          );
          this.options.onRetry?.(backoff, attempts + 1);
          this.assertActive(lifetime);
          const unloading = await this.waitForTurn(sequence, backoff, lifetime);
          this.assertActive(lifetime);
          if (unloading) {
            const attemptsRemaining = this.options.retry.maxAttempts - attempts;
            const flushOutcome = await this.runAttempt(() => performAttempt(attemptsRemaining, true), lifetime);
            this.assertActive(lifetime);
            attempts += flushOutcome.attemptsMade;
            return {
              kind: flushOutcome.kind === 'success' ? 'success' : 'terminal',
              attempts,
              failure: flushOutcome.kind === 'success' ? undefined : flushOutcome.failure,
            };
          }
        }
      },
      release,
    };
  }

  flush(): void {
    this.unloading = true;
    this.nextSendAt = 0;
    const waiting = this.waiting.splice(0);
    if (this.redeliveryTimer != null) {
      clearTimeout(this.redeliveryTimer);
      this.redeliveryTimer = undefined;
    }
    if (this.waitingTimer != null) {
      clearTimeout(this.waitingTimer);
      this.waitingTimer = undefined;
    }
    for (const delivery of waiting) {
      delivery.resolve(true);
    }
    this.runNextAttempt();
  }

  resume(): void {
    this.unloading = false;
  }

  private assertActive(lifetime: DeliveryLifetime): void {
    if (lifetime.phase === 'released') {
      throw new Error('Delivery reservation released');
    }
  }

  private runAttempt(
    perform: () => Promise<AttemptOutcome>,
    lifetime: DeliveryLifetime,
    isRedelivery = false
  ): Promise<AttemptOutcome> {
    this.assertActive(lifetime);
    return new Promise<AttemptOutcome>((resolve, reject) => {
      let started = false;
      let settled = false;
      const finish = (complete: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        if (lifetime.cancel === cancel) {
          lifetime.cancel = undefined;
        }
        const index = this.attemptQueue.indexOf(attempt);
        if (index !== -1) {
          this.attemptQueue.splice(index, 1);
        }
        if (started) {
          this.inProgress--;
        }
        complete();
        this.runNextAttempt();
      };
      const cancel = () => finish(() => reject(new Error('Delivery reservation released')));
      const run = () => {
        if (settled) {
          return;
        }
        started = true;
        this.inProgress++;
        try {
          perform().then(
            (value) => finish(() => resolve(value)),
            (error) => finish(() => reject(error))
          );
        } catch (error) {
          finish(() => reject(error));
        }
      };
      const attempt = { run, isRedelivery };
      lifetime.cancel = cancel;
      this.attemptQueue.push(attempt);
      this.runNextAttempt();
    });
  }

  private runNextAttempt(): void {
    if (this.redeliveryTimer != null) {
      clearTimeout(this.redeliveryTimer);
      this.redeliveryTimer = undefined;
    }

    while (this.inProgress < this.options.concurrency && this.attemptQueue.length > 0) {
      const now = this.options.getNow();
      const runnableIndex = this.attemptQueue.findIndex(
        ({ isRedelivery }) => this.unloading || !isRedelivery || now >= this.nextSendAt
      );
      if (runnableIndex < 0) {
        this.redeliveryTimer = setTimeout(
          () => {
            this.redeliveryTimer = undefined;
            this.runNextAttempt();
          },
          Math.max(0, this.nextSendAt - now)
        );
        return;
      }

      const [attempt] = this.attemptQueue.splice(runnableIndex, 1);
      if (attempt!.isRedelivery && !this.unloading) {
        this.nextSendAt = now + 1;
      }
      attempt!.run();
    }
  }

  private waitForTurn(sequence: number, delayMs: number, lifetime: DeliveryLifetime): Promise<boolean> {
    const jitteredDelay = Math.min(delayMs * (1 + this.options.getRandom() * 0.2), this.options.retry.maxBackoffMs);
    const readyAt = this.options.getNow() + jitteredDelay;
    this.assertActive(lifetime);
    return new Promise<boolean>((resolve, reject) => {
      const cancel = () => {
        const index = this.waiting.indexOf(delivery);
        if (index !== -1) {
          this.waiting.splice(index, 1);
        }
        lifetime.cancel = undefined;
        clearTimeout(this.waitingTimer);
        this.waitingTimer = undefined;
        this.scheduleNext();
        reject(new Error('Delivery reservation released'));
      };
      const delivery: WaitingDelivery = {
        sequence,
        readyAt,
        resolve: (unloading) => {
          if (lifetime.cancel === cancel) {
            lifetime.cancel = undefined;
          }
          resolve(unloading);
        },
      };
      lifetime.cancel = cancel;
      this.waiting.push(delivery);
      this.waiting.sort((left, right) =>
        left.readyAt === right.readyAt ? left.sequence - right.sequence : left.readyAt - right.readyAt
      );
      if (this.waitingTimer != null) {
        clearTimeout(this.waitingTimer);
        this.waitingTimer = undefined;
      }
      this.scheduleNext();
    });
  }

  private scheduleNext(): void {
    if (this.waitingTimer != null || this.waiting.length === 0) {
      return;
    }

    const next = this.waiting[0]!;
    const releaseAt = next.readyAt;
    this.waitingTimer = setTimeout(
      () => {
        this.waitingTimer = undefined;
        const waitingIndex = this.waiting.indexOf(next);
        if (waitingIndex >= 0) {
          this.waiting.splice(waitingIndex, 1);
        }
        next.resolve(false);
        this.scheduleNext();
      },
      Math.max(0, releaseAt - this.options.getNow())
    );
  }
}
