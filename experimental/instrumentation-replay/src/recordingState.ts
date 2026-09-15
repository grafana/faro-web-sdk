export interface TabRecordingState {
  sessionId: string;
  recordingId: string;
  nextSeq: number;
  gen: number;
  documentId: string;
  handoff: 'active' | 'clean';
}

interface CompletedRecording {
  state: TabRecordingState;
  local: boolean;
  anchor: string | null | undefined;
}

/** Shared only by replacements within one document activation. */
export interface DocumentRecordingState {
  owner?: object;
  handoff?: CompletedRecording;
}

export interface RecordingLease {
  readonly state: TabRecordingState;
  readonly released: Promise<void>;
  ownership: () => 'owned' | 'lost' | 'superseded';
  reserve: (meta: boolean) => { recordingId: string; seq: number; gen: number } | undefined;
  release: () => void;
}

interface StorageSnapshot {
  available: boolean;
  serialized?: string | null;
  state?: TabRecordingState;
}

interface Candidate extends CompletedRecording {
  source: 'fresh' | 'memory' | 'storage';
}

interface StoreOptions {
  storage: Storage | undefined;
  ownerNamespace: string;
  documentId: string;
  documentState: DocumentRecordingState;
  generateRecordingId: () => string;
}

export const replayRecordingStorageKeyPrefix = 'com.grafana.faro.replay.current:';

export function recordingLockName(ownerNamespace: string, recordingId: string): string {
  return `com.grafana.faro.replay.lock:${JSON.stringify([ownerNamespace, recordingId])}`;
}

export class ReplayRecordingStateStore {
  private readonly key: string;

  constructor(private readonly options: StoreOptions) {
    this.key = `${replayRecordingStorageKeyPrefix}${options.ownerNamespace}`;
  }

  /** Resolves on grant. The native request promise remains pending until release. */
  async acquire(
    sessionId: string,
    signal: AbortSignal,
    currentSessionId: () => string | null
  ): Promise<RecordingLease | undefined> {
    let candidate = this.select(sessionId);
    while (!signal.aborted) {
      type Grant = { lease: RecordingLease } | { retry: Candidate } | undefined;
      let resolveGrant!: (grant: Grant) => void;
      let rejectGrant!: (error: unknown) => void;
      const granted = new Promise<Grant>((resolve, reject) => {
        resolveGrant = resolve;
        rejectGrant = reject;
      });
      let completeRelease!: () => void;
      const released = new Promise<void>((resolve) => {
        completeRelease = resolve;
      });
      try {
        const request = navigator.locks.request(
          recordingLockName(this.options.ownerNamespace, candidate.state.recordingId),
          { mode: 'exclusive', signal },
          () => {
            if (signal.aborted || currentSessionId() !== sessionId || signal.aborted) {
              resolveGrant(undefined);
              return;
            }

            const latest = this.select(sessionId, candidate.source === 'fresh' ? candidate : undefined);
            if (signal.aborted) {
              resolveGrant(undefined);
              return;
            }
            if (latest.state.recordingId !== candidate.state.recordingId) {
              resolveGrant({ retry: latest });
              return;
            }
            if (latest.source === 'storage' && latest.state.handoff === 'active') {
              resolveGrant({ retry: this.fresh(sessionId, this.read()) });
              return;
            }

            const state: TabRecordingState = {
              ...latest.state,
              documentId: this.options.documentId,
              handoff: 'active',
            };
            let local = latest.local;
            let anchor = latest.anchor;
            if (!local) {
              if (this.write(state)) {
                anchor = JSON.stringify(state);
              } else if (latest.source !== 'fresh') {
                // A clean stored identity must not remain redeemable while its
                // counters advance without an active marker.
                resolveGrant({ retry: this.fresh(sessionId, this.read(), true) });
                return;
              } else {
                local = true;
                anchor = this.read().serialized ?? anchor;
              }
            }

            let release!: () => void;
            const held = new Promise<void>((resolve) => {
              release = resolve;
            });
            const lease = this.createLease(state, local, anchor, release, released);
            if (signal.aborted) {
              lease.release();
            }
            resolveGrant({ lease });
            return held;
          }
        );
        void request.then(completeRelease, (error) => {
          completeRelease();
          rejectGrant(error);
        });
        const grant = await granted;
        if (grant && 'lease' in grant) {
          return grant.lease;
        }
        // This promise settles after native ownership ends. Never queue another
        // recording lock while still holding the rejected candidate's lock.
        await request;
        if (!grant) {
          return undefined;
        }
        candidate = grant.retry;
      } catch (error) {
        if (signal.aborted) {
          return undefined;
        }
        throw error;
      }
    }
    return undefined;
  }

  private createLease(
    state: TabRecordingState,
    local: boolean,
    anchor: string | null | undefined,
    releaseLock: () => void,
    releasedLock: Promise<void>
  ): RecordingLease {
    const documentState = this.options.documentState;
    const owner = {};
    documentState.owner = owner;
    documentState.handoff = undefined;
    let released = false;

    const owns = (snapshot: StorageSnapshot): boolean =>
      local
        ? snapshot.serialized === anchor
        : snapshot.state?.recordingId === state.recordingId &&
          snapshot.state.sessionId === state.sessionId &&
          snapshot.state.documentId === state.documentId &&
          snapshot.state.handoff === 'active';

    const ownership: RecordingLease['ownership'] = () => {
      if (released || documentState.owner !== owner) {
        return 'superseded';
      }
      const snapshot = this.read();
      if (!snapshot.available || owns(snapshot)) {
        return 'owned';
      }
      return snapshot.state ? 'superseded' : 'lost';
    };

    return {
      state,
      released: releasedLock,
      ownership,
      reserve: (meta) => {
        if (
          ownership() !== 'owned' ||
          !Number.isSafeInteger(state.nextSeq + 1) ||
          !Number.isSafeInteger(state.gen + (meta ? 1 : 0))
        ) {
          return undefined;
        }
        if (meta) {
          state.gen++;
        }
        return { recordingId: state.recordingId, seq: state.nextSeq++, gen: Math.max(0, state.gen) };
      },
      release: () => {
        if (released) {
          return;
        }
        released = true;
        try {
          if (documentState.owner !== owner) {
            return;
          }
          const snapshot = this.read();
          if (snapshot.available && !owns(snapshot) && snapshot.state) {
            return;
          }
          const clean: TabRecordingState = { ...state, handoff: 'clean' };
          const persisted = !local && snapshot.available && owns(snapshot) && this.write(clean);
          documentState.handoff = {
            state: clean,
            local: !persisted,
            anchor: persisted ? JSON.stringify(clean) : snapshot.available ? snapshot.serialized : anchor,
          };
        } finally {
          if (documentState.owner === owner) {
            documentState.owner = undefined;
          }
          releaseLock();
        }
      },
    };
  }

  private select(sessionId: string, prepared?: Candidate): Candidate {
    const snapshot = this.read();
    if (
      prepared &&
      (!snapshot.available ||
        snapshot.serialized === prepared.anchor ||
        (prepared.anchor === undefined && !snapshot.state))
    ) {
      return {
        ...prepared,
        local: prepared.local || !snapshot.available,
        anchor: snapshot.available ? snapshot.serialized : prepared.anchor,
      };
    }
    const handoff = this.options.documentState.handoff;
    if (
      handoff?.state.sessionId === sessionId &&
      this.valid(handoff.state) &&
      ((!snapshot.available && handoff.local) || (snapshot.available && snapshot.serialized === handoff.anchor))
    ) {
      return { ...handoff, source: 'memory' };
    }
    if (snapshot.state?.sessionId === sessionId) {
      return { state: snapshot.state, source: 'storage', local: false, anchor: snapshot.serialized };
    }
    return this.fresh(sessionId, snapshot);
  }

  private fresh(sessionId: string, snapshot: StorageSnapshot, local = false): Candidate {
    return {
      state: {
        sessionId,
        recordingId: this.options.generateRecordingId(),
        nextSeq: 0,
        gen: -1,
        documentId: this.options.documentId,
        handoff: 'clean',
      },
      source: 'fresh',
      local: local || !snapshot.available,
      anchor: snapshot.serialized,
    };
  }

  private read(): StorageSnapshot {
    if (!this.options.storage) {
      return { available: false };
    }
    try {
      const serialized = this.options.storage.getItem(this.key);
      let state: unknown;
      try {
        state = serialized ? JSON.parse(serialized) : undefined;
      } catch {
        // Malformed current state cannot supply counters.
      }
      return { available: true, serialized, state: this.valid(state) ? state : undefined };
    } catch {
      return { available: false };
    }
  }

  private write(state: TabRecordingState): boolean {
    try {
      if (!this.options.storage) {
        return false;
      }
      this.options.storage.setItem(this.key, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  private valid(value: unknown): value is TabRecordingState {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const state = value as Partial<TabRecordingState>;
    return (
      typeof state.sessionId === 'string' &&
      state.sessionId.length > 0 &&
      typeof state.recordingId === 'string' &&
      state.recordingId.length > 0 &&
      typeof state.documentId === 'string' &&
      state.documentId.length > 0 &&
      Number.isSafeInteger(state.nextSeq) &&
      state.nextSeq! >= 0 &&
      state.nextSeq! < Number.MAX_SAFE_INTEGER &&
      Number.isSafeInteger(state.gen) &&
      state.gen! >= -1 &&
      state.gen! < Number.MAX_SAFE_INTEGER &&
      (state.handoff === 'active' || state.handoff === 'clean')
    );
  }
}
