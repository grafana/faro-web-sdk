export interface ReplayRecordingState {
  sessionId: string;
  recordingId: string;
  nextSeq: number;
  gen: number;
}

interface PersistedReplayRecordingState extends ReplayRecordingState {
  handoff: 'active' | 'clean';
  documentId: string;
}

export class ReplayRecordingStateStore {
  constructor(
    private readonly storage: Storage | undefined,
    private readonly storageKey: string,
    private readonly documentId: string,
    private readonly generateRecordingId: () => string
  ) {}

  claim(sessionId: string, activeHandoffRecordingId?: string): ReplayRecordingState {
    const persisted = this.read();
    if (
      persisted?.sessionId === sessionId &&
      (persisted.handoff === 'clean' ||
        (persisted.handoff === 'active' && persisted.recordingId === activeHandoffRecordingId))
    ) {
      const continuedState: ReplayRecordingState = {
        sessionId,
        recordingId: persisted.recordingId,
        nextSeq: persisted.nextSeq,
        gen: persisted.gen,
      };
      if (this.write({ ...continuedState, handoff: 'active', documentId: this.documentId })) {
        return continuedState;
      }
    }

    const recoveryState: ReplayRecordingState = {
      sessionId,
      recordingId: this.generateRecordingId(),
      nextSeq: 0,
      gen: -1,
    };
    this.write({ ...recoveryState, handoff: 'active', documentId: this.documentId });
    return recoveryState;
  }

  checkpoint(state: ReplayRecordingState): boolean {
    const persisted = this.read();
    if (
      persisted?.handoff !== 'active' ||
      persisted.documentId !== this.documentId ||
      persisted.sessionId !== state.sessionId ||
      persisted.recordingId !== state.recordingId
    ) {
      return false;
    }

    return this.write({ ...state, handoff: 'active', documentId: this.documentId });
  }

  seal(state: ReplayRecordingState): boolean {
    const persisted = this.read();
    if (
      persisted?.handoff !== 'active' ||
      persisted.documentId !== this.documentId ||
      persisted.sessionId !== state.sessionId ||
      persisted.recordingId !== state.recordingId
    ) {
      return false;
    }

    return this.write({ ...state, handoff: 'clean', documentId: this.documentId });
  }

  private read(): PersistedReplayRecordingState | undefined {
    if (!this.storage) {
      return undefined;
    }

    try {
      const serialized = this.storage.getItem(this.storageKey);
      if (!serialized) {
        return undefined;
      }

      const value: unknown = JSON.parse(serialized);
      if (!this.isPersistedState(value)) {
        return undefined;
      }

      return value;
    } catch {
      return undefined;
    }
  }

  private write(state: PersistedReplayRecordingState): boolean {
    if (!this.storage) {
      return false;
    }

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  private isPersistedState(value: unknown): value is PersistedReplayRecordingState {
    if (value == null || typeof value !== 'object') {
      return false;
    }

    const state = value as Partial<PersistedReplayRecordingState>;
    return (
      typeof state.sessionId === 'string' &&
      typeof state.recordingId === 'string' &&
      Number.isSafeInteger(state.nextSeq) &&
      state.nextSeq! >= 0 &&
      Number.isSafeInteger(state.gen) &&
      state.gen! >= -1 &&
      (state.handoff === 'active' || state.handoff === 'clean') &&
      typeof state.documentId === 'string'
    );
  }
}
