import { ReplayRecordingStateStore } from './recordingState';

describe('ReplayRecordingStateStore', () => {
  const storageKey = 'test-replay-recording';

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('claims a clean handoff for the same session and marks the new document active', () => {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        sessionId: 'session-a',
        recordingId: 'recording-a',
        nextSeq: 42,
        gen: 3,
        handoff: 'clean',
        documentId: 'old-document',
      })
    );
    const store = new ReplayRecordingStateStore(
      window.sessionStorage,
      storageKey,
      'new-document',
      () => 'new-recording'
    );

    const claim = store.claim('session-a');

    expect(claim).toEqual({ sessionId: 'session-a', recordingId: 'recording-a', nextSeq: 42, gen: 3 });
    expect(JSON.parse(window.sessionStorage.getItem(storageKey)!)).toEqual({
      sessionId: 'session-a',
      recordingId: 'recording-a',
      nextSeq: 42,
      gen: 3,
      handoff: 'active',
      documentId: 'new-document',
    });
  });

  it.each([
    ['an active handoff', 'session-a', 'active'],
    ['a clean handoff from another session', 'session-b', 'clean'],
  ])('mints a recovery recording for %s', (_scenario, storedSessionId, handoff) => {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        sessionId: storedSessionId,
        recordingId: 'old-recording',
        nextSeq: 42,
        gen: 3,
        handoff,
        documentId: 'old-document',
      })
    );
    const store = new ReplayRecordingStateStore(
      window.sessionStorage,
      storageKey,
      'new-document',
      () => 'new-recording'
    );

    expect(store.claim('session-a')).toEqual({
      sessionId: 'session-a',
      recordingId: 'new-recording',
      nextSeq: 0,
      gen: -1,
    });
  });

  it('continues an active recording only with an explicit in-memory handoff token', () => {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        sessionId: 'session-a',
        recordingId: 'recording-a',
        nextSeq: 42,
        gen: 3,
        handoff: 'active',
        documentId: 'same-document',
      })
    );
    const store = new ReplayRecordingStateStore(
      window.sessionStorage,
      storageKey,
      'replacement-owner',
      () => 'new-recording'
    );

    expect(store.claim('session-a', 'recording-a')).toEqual({
      sessionId: 'session-a',
      recordingId: 'recording-a',
      nextSeq: 42,
      gen: 3,
    });
  });

  it('seals exact counters only while the document owns the active state', () => {
    const owner = new ReplayRecordingStateStore(
      window.sessionStorage,
      storageKey,
      'owner-document',
      () => 'recording-a'
    );
    const state = owner.claim('session-a');

    expect(owner.seal({ ...state, nextSeq: 58, gen: 2 })).toBe(true);
    expect(JSON.parse(window.sessionStorage.getItem(storageKey)!)).toEqual({
      sessionId: 'session-a',
      recordingId: 'recording-a',
      nextSeq: 58,
      gen: 2,
      handoff: 'clean',
      documentId: 'owner-document',
    });

    const staleDocument = new ReplayRecordingStateStore(
      window.sessionStorage,
      storageKey,
      'stale-document',
      () => 'unused'
    );
    expect(staleDocument.seal({ ...state, nextSeq: 100, gen: 3 })).toBe(false);
  });

  it('checkpoints exact counters without making a live document claimable by another document', () => {
    const owner = new ReplayRecordingStateStore(
      window.sessionStorage,
      storageKey,
      'owner-document',
      () => 'recording-a'
    );
    const state = owner.claim('session-a');

    expect(owner.checkpoint({ ...state, nextSeq: 58, gen: 2 })).toBe(true);
    expect(JSON.parse(window.sessionStorage.getItem(storageKey)!)).toEqual({
      sessionId: 'session-a',
      recordingId: 'recording-a',
      nextSeq: 58,
      gen: 2,
      handoff: 'active',
      documentId: 'owner-document',
    });
  });

  it('mints a recovery recording when a clean handoff cannot be marked active', () => {
    const storage = {
      getItem: jest.fn(() =>
        JSON.stringify({
          sessionId: 'session-a',
          recordingId: 'stale-recording',
          nextSeq: 42,
          gen: 3,
          handoff: 'clean',
          documentId: 'old-document',
        })
      ),
      setItem: jest.fn(() => {
        throw new DOMException('Storage is not writable', 'SecurityError');
      }),
    } as unknown as Storage;
    const store = new ReplayRecordingStateStore(storage, storageKey, 'new-document', () => 'recovery-recording');

    expect(store.claim('session-a')).toEqual({
      sessionId: 'session-a',
      recordingId: 'recovery-recording',
      nextSeq: 0,
      gen: -1,
    });
  });
});
