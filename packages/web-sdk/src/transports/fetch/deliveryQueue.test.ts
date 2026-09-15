import { type AttemptOutcome, ReliableDeliveryQueue } from './deliveryQueue';

const success: AttemptOutcome = { kind: 'success', attemptsMade: 1 };
const queue = () =>
  new ReliableDeliveryQueue({
    bufferSize: 2,
    concurrency: 1,
    retry: { maxAttempts: 3, initialBackoffMs: 10, maxBackoffMs: 100, backoffMultiplier: 2 },
    getNow: Date.now,
    getRandom: () => 0,
  });

afterEach(() => {
  jest.useRealTimers();
});

it('refuses delivery after the reservation has been released', async () => {
  const reservation = queue().reserve()!;
  reservation.release();
  const attempt = jest.fn(async () => success);
  await expect(reservation.deliver(attempt)).rejects.toThrow('released');
  expect(attempt).not.toHaveBeenCalled();
});

it('cancels a queued attempt without waiting for another worker', async () => {
  const delivery = queue();
  const first = delivery.reserve()!;
  const second = delivery.reserve()!;
  let finish!: (value: AttemptOutcome) => void;
  const running = first.deliver(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const attempt = jest.fn(async () => success);
  let cancelled = false;
  const waiting = second.deliver(attempt).catch(() => {
    cancelled = true;
  });
  second.release();
  await Promise.resolve();
  await Promise.resolve();
  expect(cancelled).toBe(true);
  finish(success);
  await Promise.all([running, waiting]);
  first.release();
  expect(attempt).not.toHaveBeenCalled();
});

it('frees an abandoned worker once and ignores its late completion', async () => {
  const delivery = queue();
  const first = delivery.reserve()!;
  const second = delivery.reserve()!;
  let finishFirst!: (value: AttemptOutcome) => void;
  let finishSecond!: (value: AttemptOutcome) => void;
  const abandoned = first
    .deliver(
      () =>
        new Promise((resolve) => {
          finishFirst = resolve;
        })
    )
    .catch(() => {});
  const nextAttempt = jest.fn(
    () =>
      new Promise<AttemptOutcome>((resolve) => {
        finishSecond = resolve;
      })
  );
  const next = second.deliver(nextAttempt);
  first.release();
  first.release();
  await Promise.resolve();
  expect(nextAttempt).toHaveBeenCalledTimes(1);

  const third = delivery.reserve()!;
  const thirdAttempt = jest.fn(async () => success);
  const waiting = third.deliver(thirdAttempt);
  finishFirst(success);
  await Promise.resolve();
  await Promise.resolve();
  expect(thirdAttempt).not.toHaveBeenCalled();
  finishSecond(success);
  await Promise.all([abandoned, next, waiting]);
  second.release();
  third.release();
  expect(thirdAttempt).toHaveBeenCalledTimes(1);
});

it('cancels backoff and cannot be flushed into another attempt after release', async () => {
  jest.useFakeTimers();
  const delivery = queue();
  const reservation = delivery.reserve()!;
  const attempt = jest.fn<Promise<AttemptOutcome>, []>().mockResolvedValue({
    kind: 'retry',
    attemptsMade: 1,
    failure: { status: 503 },
  });
  let cancelled = false;
  const pending = reservation.deliver(attempt).catch(() => {
    cancelled = true;
  });
  await jest.advanceTimersByTimeAsync(0);
  reservation.release();
  await jest.advanceTimersByTimeAsync(0);
  expect(cancelled).toBe(true);
  delivery.flush();
  await jest.advanceTimersByTimeAsync(100);
  await pending;
  expect(attempt).toHaveBeenCalledTimes(1);
});
