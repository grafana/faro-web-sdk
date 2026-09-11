export interface ReplayRecordingState {
  sessionId: string;
  recordingId: string;
  nextSeq: number;
  gen: number;
}

interface PersistedReplayRecordingState extends Omit<ReplayRecordingState, 'recordingId'> {
  handoff: 'active' | 'clean';
  documentId: string;
  updatedAt: number;
}

interface PersistedRecordingPointer {
  recordingId: string;
}

export interface ReplayRecordingStateStoreOptions {
  // Tab-scoped storage (sessionStorage) holding only a pointer to the current recording.
  // A browser may copy it into a derived tab; that is harmless because it carries no counters.
  tabStorage: Storage | undefined;
  // Origin-shared storage (localStorage) holding one checkpoint per recording. Every tab that
  // references a recording reads and writes the same entry, so ownership is unambiguous.
  sharedStorage: Storage | undefined;
  ownerNamespace: string;
  documentId: string;
  generateRecordingId: () => string;
  now?: () => number;
  // Shared by replacement stores for the same owner in one Document.
  abandonedRecordingIds?: Set<string>;
}

export const replayRecordingPointerKeyPrefix = 'com.grafana.faro.replay.tab:';
export const replayRecordingCheckpointKeyPrefix = 'com.grafana.faro.replay.rec:';
// Pre-v3 builds kept a copyable checkpoint under this key. It is removed, never adopted.
export const legacyReplayRecordingStorageKeyPrefix = 'com.grafana.faro.replay:';

// Pruning only costs continuity, for a dormant tab or for a live tab beyond the bounds whose
// entry is refreshed only at Document boundaries; it can never enable a collision.
export const MAX_RETAINED_RECORDING_CHECKPOINTS: number = 16;
export const MAX_RECORDING_CHECKPOINT_AGE_MS: number = 24 * 60 * 60 * 1000;

export function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const entries = new Map(Object.entries(initial));
  return {
    get length() {
      return entries.size;
    },
    key: (index: number) => Array.from(entries.keys())[index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, String(value)),
    removeItem: (key: string) => void entries.delete(key),
    clear: () => entries.clear(),
  };
}

export class ReplayRecordingStateStore {
  private readonly tabStorage: Storage | undefined;
  private readonly sharedStorage: Storage | undefined;
  private readonly documentId: string;
  private readonly generateRecordingId: () => string;
  private readonly now: () => number;
  private readonly pointerKey: string;
  private readonly checkpointKeyPrefix: string;
  private readonly legacyKey: string;
  private readonly abandonedRecordingIds: Set<string>;

  constructor(options: ReplayRecordingStateStoreOptions) {
    this.tabStorage = options.tabStorage;
    this.sharedStorage = options.sharedStorage;
    this.documentId = options.documentId;
    this.generateRecordingId = options.generateRecordingId;
    this.now = options.now ?? (() => Date.now());
    this.pointerKey = `${replayRecordingPointerKeyPrefix}${options.ownerNamespace}`;
    this.checkpointKeyPrefix = `${replayRecordingCheckpointKeyPrefix}${options.ownerNamespace}:`;
    this.legacyKey = `${legacyReplayRecordingStorageKeyPrefix}${options.ownerNamespace}`;
    this.abandonedRecordingIds = options.abandonedRecordingIds ?? new Set();
  }

  // Prefer the one-time same-document handoff over a possibly stale tab pointer.
  // Continue only a clean checkpoint or the explicitly handed-off active checkpoint.
  // Missing, invalid, or abandoned state fails closed into a recovery recording.
  claim(sessionId: string, activeHandoffRecordingId?: string): ReplayRecordingState {
    const recordingId = activeHandoffRecordingId ?? this.readPointer();
    if (recordingId !== undefined && !this.abandonedRecordingIds.has(recordingId)) {
      const persisted = this.readCheckpoint(recordingId);
      if (
        persisted?.sessionId === sessionId &&
        (persisted.handoff === 'clean' || (persisted.handoff === 'active' && recordingId === activeHandoffRecordingId))
      ) {
        const continuedState: ReplayRecordingState = {
          sessionId,
          recordingId,
          nextSeq: persisted.nextSeq,
          gen: persisted.gen,
        };
        if (this.writeCheckpoint(continuedState, 'active')) {
          if (activeHandoffRecordingId !== undefined) {
            this.writePointer(recordingId);
          }
          this.prune(recordingId);
          return continuedState;
        }
      }
    }

    const recoveryState: ReplayRecordingState = {
      sessionId,
      recordingId: this.generateRecordingId(),
      nextSeq: 0,
      gen: -1,
    };
    this.writeCheckpoint(recoveryState, 'active');
    // A claimant that lost points at its own recording from now on and stops touching the
    // winner's entry, so both tabs regain continuity after a split.
    this.writePointer(recoveryState.recordingId);
    this.prune(recoveryState.recordingId);
    return recoveryState;
  }

  // Revocation must survive failed pointer writes and later clean checkpoints.
  abandon(recordingId: string): void {
    this.abandonedRecordingIds.add(recordingId);
  }

  checkpoint(state: ReplayRecordingState): boolean {
    return this.transition(state, 'active');
  }

  // Whether a `storage` event from another Document shows that this recording's entry now
  // belongs to a different Document. Two claimants can both read a clean checkpoint inside the
  // browser's cross-process replication window; the browser then delivers the other claimant's
  // write as a `storage` event, which is the positive evidence this Document lost the race.
  // A removed entry is not evidence of a claimant, so it only costs continuity later.
  hasLostOwnership(
    recordingId: string,
    key: string | null,
    newValue: string | null,
    storageArea: Storage | null
  ): boolean {
    if (!this.sharedStorage || key !== this.checkpointKey(recordingId)) {
      return false;
    }

    if (storageArea !== null && storageArea !== this.sharedStorage) {
      return false;
    }

    const persisted = this.parseCheckpoint(newValue);
    return persisted !== undefined && persisted.documentId !== this.documentId;
  }

  seal(state: ReplayRecordingState): boolean {
    return this.transition(state, 'clean');
  }

  removeLegacyState(): void {
    try {
      this.tabStorage?.removeItem(this.legacyKey);
    } catch {
      // Best effort: the legacy key is never read, so leaving it behind is harmless.
    }
  }

  private transition(state: ReplayRecordingState, handoff: PersistedReplayRecordingState['handoff']): boolean {
    const persisted = this.readCheckpoint(state.recordingId);
    if (
      persisted?.handoff !== 'active' ||
      persisted.documentId !== this.documentId ||
      persisted.sessionId !== state.sessionId
    ) {
      return false;
    }

    return this.writeCheckpoint(state, handoff);
  }

  // Remove other recordings' checkpoints past the age bound, then evict the oldest clean
  // checkpoints before active ones to meet the cap.
  // The claiming tab's own entry is exempt. Malformed entries under our prefix can never be
  // claimed, so they are removed as well.
  private prune(exemptRecordingId: string): void {
    const storage = this.sharedStorage;
    if (!storage) {
      return;
    }

    try {
      const exemptKey = this.checkpointKey(exemptRecordingId);
      const candidates: string[] = [];
      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (key === null || key === exemptKey || !key.startsWith(this.checkpointKeyPrefix)) {
          continue;
        }
        candidates.push(key);
      }

      const now = this.now();
      const retained: Array<{
        key: string;
        updatedAt: number;
        handoff: PersistedReplayRecordingState['handoff'];
      }> = [];
      for (const key of candidates) {
        const state = this.parseCheckpoint(storage.getItem(key));
        if (state === undefined || now - state.updatedAt > MAX_RECORDING_CHECKPOINT_AGE_MS) {
          storage.removeItem(key);
        } else {
          retained.push({ key, updatedAt: state.updatedAt, handoff: state.handoff });
        }
      }

      retained.sort((a, b) => {
        if (a.handoff !== b.handoff) {
          return a.handoff === 'clean' ? -1 : 1;
        }
        return a.updatedAt - b.updatedAt;
      });
      const excess = Math.max(0, retained.length - (MAX_RETAINED_RECORDING_CHECKPOINTS - 1));
      for (const stale of retained.slice(0, excess)) {
        storage.removeItem(stale.key);
      }
    } catch {
      // Pruning is best effort and must never affect the claim that triggered it.
    }
  }

  private checkpointKey(recordingId: string): string {
    return `${this.checkpointKeyPrefix}${recordingId}`;
  }

  private readPointer(): string | undefined {
    if (!this.tabStorage) {
      return undefined;
    }

    try {
      const serialized = this.tabStorage.getItem(this.pointerKey);
      if (!serialized) {
        return undefined;
      }

      const value: unknown = JSON.parse(serialized);
      return this.isPointer(value) ? value.recordingId : undefined;
    } catch {
      return undefined;
    }
  }

  private writePointer(recordingId: string): void {
    if (!this.tabStorage) {
      return;
    }

    try {
      const pointer: PersistedRecordingPointer = { recordingId };
      this.tabStorage.setItem(this.pointerKey, JSON.stringify(pointer));
    } catch {
      // The in-memory recording remains usable even if its pointer cannot be persisted.
    }
  }

  private readCheckpoint(recordingId: string): PersistedReplayRecordingState | undefined {
    if (!this.sharedStorage) {
      return undefined;
    }

    try {
      return this.parseCheckpoint(this.sharedStorage.getItem(this.checkpointKey(recordingId)));
    } catch {
      return undefined;
    }
  }

  private parseCheckpoint(serialized: string | null): PersistedReplayRecordingState | undefined {
    if (!serialized) {
      return undefined;
    }

    try {
      const value: unknown = JSON.parse(serialized);
      return this.isPersistedState(value) ? value : undefined;
    } catch {
      return undefined;
    }
  }

  private writeCheckpoint(state: ReplayRecordingState, handoff: PersistedReplayRecordingState['handoff']): boolean {
    if (!this.sharedStorage) {
      return false;
    }

    try {
      const persisted: PersistedReplayRecordingState = {
        sessionId: state.sessionId,
        nextSeq: state.nextSeq,
        gen: state.gen,
        handoff,
        documentId: this.documentId,
        updatedAt: this.now(),
      };
      this.sharedStorage.setItem(this.checkpointKey(state.recordingId), JSON.stringify(persisted));
      return true;
    } catch {
      return false;
    }
  }

  private isPointer(value: unknown): value is PersistedRecordingPointer {
    return (
      value != null &&
      typeof value === 'object' &&
      typeof (value as Partial<PersistedRecordingPointer>).recordingId === 'string' &&
      (value as PersistedRecordingPointer).recordingId.length > 0
    );
  }

  private isPersistedState(value: unknown): value is PersistedReplayRecordingState {
    if (value == null || typeof value !== 'object') {
      return false;
    }

    const state = value as Partial<PersistedReplayRecordingState>;
    return (
      typeof state.sessionId === 'string' &&
      Number.isSafeInteger(state.nextSeq) &&
      state.nextSeq! >= 0 &&
      Number.isSafeInteger(state.gen) &&
      state.gen! >= -1 &&
      (state.handoff === 'active' || state.handoff === 'clean') &&
      typeof state.documentId === 'string' &&
      Number.isSafeInteger(state.updatedAt) &&
      state.updatedAt! >= 0
    );
  }
}
