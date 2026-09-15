let producer: object | undefined;
let executionDepth = 0;
let pendingCleanup: Promise<void> | undefined;

export function registerReplayProducer(owner: object): () => void {
  if (producer) {
    throw new Error('The shared rrweb runtime already has a Replay producer');
  }
  producer = owner;
  return () => {
    if (producer === owner) {
      producer = undefined;
    }
  };
}

/** Also wraps rrweb callbacks reached from checkout or deferred initialization. */
export function runInRrweb<T>(callback: () => T): T {
  executionDepth++;
  try {
    return callback();
  } finally {
    executionDepth--;
  }
}

/** Revoke at the caller first; physical cleanup waits for the enclosing rrweb stack. */
export function finishRrweb(callback: () => void | Promise<void>): void {
  const previous = pendingCleanup;
  let complete!: () => void;
  const finished = new Promise<void>((resolve) => {
    complete = resolve;
  });
  pendingCleanup = finished;
  const run = () => {
    try {
      // Callers report cleanup failures and release leases in finally. A failed
      // cleanup must still unblock the next producer.
      void Promise.resolve(callback()).then(complete, complete);
    } catch {
      complete();
    }
  };
  if (executionDepth > 0 || previous) {
    void (previous ?? Promise.resolve()).then(run);
  } else {
    run();
  }
  void finished.then(() => {
    if (pendingCleanup === finished) {
      pendingCleanup = undefined;
    }
  });
}

export async function waitForRrwebCleanup(): Promise<void> {
  while (pendingCleanup) {
    await pendingCleanup;
  }
}
