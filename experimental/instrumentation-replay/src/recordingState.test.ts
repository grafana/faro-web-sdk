import {
  createMemoryStorage,
  legacyReplayRecordingStorageKeyPrefix,
  MAX_RECORDING_CHECKPOINT_AGE_MS,
  MAX_RETAINED_RECORDING_CHECKPOINTS,
  replayRecordingCheckpointKeyPrefix,
  replayRecordingPointerKeyPrefix,
  ReplayRecordingStateStore,
} from './recordingState';

describe('ReplayRecordingStateStore', () => {
  const owner = '["faro","app","","production"]';
  const pointerKey = `${replayRecordingPointerKeyPrefix}${owner}`;
  const checkpointKey = (recordingId: string) => `${replayRecordingCheckpointKeyPrefix}${owner}:${recordingId}`;
  const checkpointKeys = (storage: Storage) =>
    Array.from({ length: storage.length }, (_, index) => storage.key(index)!).filter((key) =>
      key.startsWith(`${replayRecordingCheckpointKeyPrefix}${owner}:`)
    );

  function makeStore(
    tabStorage: Storage | undefined,
    sharedStorage: Storage | undefined,
    documentId: string,
    recoveryRecordingId: string,
    now?: () => number
  ): ReplayRecordingStateStore {
    return new ReplayRecordingStateStore({
      tabStorage,
      sharedStorage,
      ownerNamespace: owner,
      documentId,
      generateRecordingId: () => recoveryRecordingId,
      now,
    });
  }

  // A browser derives a new tab by copying the whole sessionStorage area.
  function cloneTab(tabStorage: Storage): Storage {
    const copy: Record<string, string> = {};
    for (let index = 0; index < tabStorage.length; index++) {
      const key = tabStorage.key(index)!;
      copy[key] = tabStorage.getItem(key)!;
    }
    return createMemoryStorage(copy);
  }

  function readCheckpoint(shared: Storage, recordingId: string) {
    return JSON.parse(shared.getItem(checkpointKey(recordingId))!);
  }

  describe('single tab', () => {
    it('continues the recording the tab points at when its checkpoint is clean', () => {
      const tab = createMemoryStorage();
      const shared = createMemoryStorage();
      const first = makeStore(tab, shared, 'doc-1', 'recording-a', () => 1_000);
      const state = first.claim('session-a');
      expect(state).toEqual({ sessionId: 'session-a', recordingId: 'recording-a', nextSeq: 0, gen: -1 });
      expect(JSON.parse(tab.getItem(pointerKey)!)).toEqual({ recordingId: 'recording-a' });
      expect(first.seal({ ...state, nextSeq: 42, gen: 3 })).toBe(true);
      expect(readCheckpoint(shared, 'recording-a')).toEqual({
        sessionId: 'session-a',
        nextSeq: 42,
        gen: 3,
        handoff: 'clean',
        documentId: 'doc-1',
        updatedAt: 1_000,
      });

      const next = makeStore(tab, shared, 'doc-2', 'unused', () => 2_000);
      expect(next.claim('session-a')).toEqual({
        sessionId: 'session-a',
        recordingId: 'recording-a',
        nextSeq: 42,
        gen: 3,
      });
      expect(readCheckpoint(shared, 'recording-a')).toEqual(
        expect.objectContaining({ handoff: 'active', documentId: 'doc-2', updatedAt: 2_000 })
      );
    });

    it('continues an active checkpoint only with the explicit in-memory handoff for that recording', () => {
      const tab = createMemoryStorage();
      const shared = createMemoryStorage();
      const state = makeStore(tab, shared, 'doc-1', 'recording-a').claim('session-a');
      expect(makeStore(tab, shared, 'doc-1', 'recording-a').checkpoint({ ...state, nextSeq: 5, gen: 0 })).toBe(true);

      const withoutHandoff = makeStore(tab, shared, 'doc-2', 'recovery-1');
      expect(withoutHandoff.claim('session-a').recordingId).toBe('recovery-1');

      const shared2 = createMemoryStorage();
      const tab2 = createMemoryStorage();
      const owned = makeStore(tab2, shared2, 'doc-1', 'recording-a').claim('session-a');
      makeStore(tab2, shared2, 'doc-1', 'recording-a').checkpoint({ ...owned, nextSeq: 5, gen: 0 });
      const replacement = makeStore(tab2, shared2, 'doc-2', 'recovery-2');
      expect(replacement.claim('session-a', 'recording-a')).toEqual({
        sessionId: 'session-a',
        recordingId: 'recording-a',
        nextSeq: 5,
        gen: 0,
      });
      expect(replacement.claim('session-a', 'other-recording').recordingId).toBe('recovery-2');
    });

    it('seals and checkpoints exact counters only while the document owns the active entry', () => {
      const tab = createMemoryStorage();
      const shared = createMemoryStorage();
      const ownerStore = makeStore(tab, shared, 'owner-document', 'recording-a');
      const state = ownerStore.claim('session-a');

      expect(ownerStore.checkpoint({ ...state, nextSeq: 58, gen: 2 })).toBe(true);
      expect(readCheckpoint(shared, 'recording-a')).toEqual(
        expect.objectContaining({ nextSeq: 58, gen: 2, handoff: 'active' })
      );

      const stale = makeStore(tab, shared, 'stale-document', 'unused');
      expect(stale.seal({ ...state, nextSeq: 100, gen: 3 })).toBe(false);
      expect(stale.checkpoint({ ...state, nextSeq: 100, gen: 3 })).toBe(false);
      expect(ownerStore.seal({ ...state, sessionId: 'session-b', nextSeq: 100, gen: 3 })).toBe(false);

      expect(ownerStore.seal({ ...state, nextSeq: 60, gen: 2 })).toBe(true);
      expect(readCheckpoint(shared, 'recording-a')).toEqual(expect.objectContaining({ nextSeq: 60, handoff: 'clean' }));
      // A sealed entry is no longer owned by anyone.
      expect(ownerStore.checkpoint({ ...state, nextSeq: 61, gen: 2 })).toBe(false);
    });

    it('rewrites the pointer to the recovery recording', () => {
      const tab = createMemoryStorage({ [pointerKey]: JSON.stringify({ recordingId: 'gone' }) });
      const shared = createMemoryStorage();
      expect(makeStore(tab, shared, 'doc-1', 'recovery').claim('session-a').recordingId).toBe('recovery');
      expect(JSON.parse(tab.getItem(pointerKey)!)).toEqual({ recordingId: 'recovery' });
      expect(readCheckpoint(shared, 'recovery')).toEqual(
        expect.objectContaining({ handoff: 'active', documentId: 'doc-1' })
      );
    });
  });

  describe('cloned tabs', () => {
    function dormantOriginal() {
      const tab = createMemoryStorage();
      const shared = createMemoryStorage();
      const store = makeStore(tab, shared, 'doc-a1', 'recording-a');
      const state = store.claim('session-a');
      expect(store.seal({ ...state, nextSeq: 42, gen: 3 })).toBe(true);
      return { tab, shared, clone: cloneTab(tab) };
    }

    it('lets the clone continue when it claims first and makes the original recover', () => {
      const { tab, shared, clone } = dormantOriginal();

      const cloneClaim = makeStore(clone, shared, 'doc-c1', 'recovery-clone').claim('session-a');
      const originalClaim = makeStore(tab, shared, 'doc-a2', 'recovery-original').claim('session-a');

      expect(cloneClaim).toEqual({ sessionId: 'session-a', recordingId: 'recording-a', nextSeq: 42, gen: 3 });
      expect(originalClaim).toEqual({ sessionId: 'session-a', recordingId: 'recovery-original', nextSeq: 0, gen: -1 });
      expect(JSON.parse(tab.getItem(pointerKey)!)).toEqual({ recordingId: 'recovery-original' });
      expect(JSON.parse(clone.getItem(pointerKey)!)).toEqual({ recordingId: 'recording-a' });
    });

    it('makes the clone recover when the original claims first', () => {
      const { tab, shared, clone } = dormantOriginal();

      const originalClaim = makeStore(tab, shared, 'doc-a2', 'recovery-original').claim('session-a');
      const cloneClaim = makeStore(clone, shared, 'doc-c1', 'recovery-clone').claim('session-a');

      expect(originalClaim.recordingId).toBe('recording-a');
      expect(cloneClaim).toEqual({ sessionId: 'session-a', recordingId: 'recovery-clone', nextSeq: 0, gen: -1 });
    });

    it('makes the clone recover after the winner navigated and reclaimed in between', () => {
      const { tab, shared, clone } = dormantOriginal();

      const second = makeStore(tab, shared, 'doc-a2', 'unused');
      const state = second.claim('session-a');
      expect(second.seal({ ...state, nextSeq: 50, gen: 4 })).toBe(true);
      const third = makeStore(tab, shared, 'doc-a3', 'unused');
      expect(third.claim('session-a')).toEqual(expect.objectContaining({ recordingId: 'recording-a', nextSeq: 50 }));

      expect(makeStore(clone, shared, 'doc-c1', 'recovery-clone').claim('session-a').recordingId).toBe(
        'recovery-clone'
      );
    });

    it('makes the clone recover when it claims while the winner is dormant again, without stale counters', () => {
      const { tab, shared, clone } = dormantOriginal();

      const second = makeStore(tab, shared, 'doc-a2', 'unused');
      const state = second.claim('session-a');
      expect(second.seal({ ...state, nextSeq: 50, gen: 4 })).toBe(true);

      // The clone wins the dormant checkpoint, but from its latest sealed counters, never
      // from the copied ones.
      expect(makeStore(clone, shared, 'doc-c1', 'unused').claim('session-a')).toEqual({
        sessionId: 'session-a',
        recordingId: 'recording-a',
        nextSeq: 50,
        gen: 4,
      });
      expect(makeStore(tab, shared, 'doc-a3', 'recovery-original').claim('session-a').recordingId).toBe(
        'recovery-original'
      );
    });

    it('lets both claimants of one replication race detect the other write and nothing else', () => {
      const { tab, shared, clone } = dormantOriginal();
      // Each renderer process reads its own replica of localStorage during the race window.
      const replicaOriginal = cloneTab(shared);
      const replicaClone = cloneTab(shared);
      const original = makeStore(tab, replicaOriginal, 'doc-a2', 'recovery-original');
      const cloned = makeStore(clone, replicaClone, 'doc-c1', 'recovery-clone');

      const originalClaim = original.claim('session-a');
      const cloneClaim = cloned.claim('session-a');
      expect(cloneClaim).toEqual(originalClaim);

      // The browser then delivers each write to the other Document as a storage event.
      const key = checkpointKey('recording-a');
      expect(original.hasLostOwnership('recording-a', key, replicaClone.getItem(key), null)).toBe(true);
      expect(cloned.hasLostOwnership('recording-a', key, replicaOriginal.getItem(key), null)).toBe(true);

      // Own writes, other recordings, removals, malformed values, and other areas are not evidence.
      expect(original.hasLostOwnership('recording-a', key, replicaOriginal.getItem(key), null)).toBe(false);
      expect(
        original.hasLostOwnership('recording-a', checkpointKey('recording-b'), replicaClone.getItem(key), null)
      ).toBe(false);
      expect(original.hasLostOwnership('recording-a', key, null, null)).toBe(false);
      expect(original.hasLostOwnership('recording-a', key, 'not json', null)).toBe(false);
      expect(original.hasLostOwnership('recording-a', key, replicaClone.getItem(key), createMemoryStorage())).toBe(
        false
      );
      expect(original.hasLostOwnership('recording-a', key, replicaClone.getItem(key), replicaOriginal)).toBe(true);
      expect(
        makeStore(tab, undefined, 'doc-x', 'x').hasLostOwnership('recording-a', key, replicaClone.getItem(key), null)
      ).toBe(false);

      // A sealed entry under the other Document is equally foreign.
      expect(cloned.seal({ ...cloneClaim, nextSeq: 50, gen: 4 })).toBe(true);
      expect(original.hasLostOwnership('recording-a', key, replicaClone.getItem(key), null)).toBe(true);
    });

    it('gives both tabs continuity again after a split', () => {
      const { tab, shared, clone } = dormantOriginal();

      const cloneStore = makeStore(clone, shared, 'doc-c1', 'unused');
      const cloneState = cloneStore.claim('session-a');
      const originalStore = makeStore(tab, shared, 'doc-a2', 'recovery-original');
      const originalState = originalStore.claim('session-a');

      expect(cloneStore.seal({ ...cloneState, nextSeq: 45, gen: 4 })).toBe(true);
      expect(originalStore.seal({ ...originalState, nextSeq: 7, gen: 0 })).toBe(true);

      expect(makeStore(clone, shared, 'doc-c2', 'unused').claim('session-a')).toEqual({
        sessionId: 'session-a',
        recordingId: 'recording-a',
        nextSeq: 45,
        gen: 4,
      });
      expect(makeStore(tab, shared, 'doc-a3', 'unused').claim('session-a')).toEqual({
        sessionId: 'session-a',
        recordingId: 'recovery-original',
        nextSeq: 7,
        gen: 0,
      });
    });
  });

  describe('fail closed', () => {
    const validCheckpoint = JSON.stringify({
      sessionId: 'session-a',
      nextSeq: 42,
      gen: 3,
      handoff: 'clean',
      documentId: 'old-document',
      updatedAt: 1_000,
    });

    it.each<[string, () => { tab: Storage | undefined; shared: Storage | undefined }]>([
      [
        'a missing pointer',
        () => ({
          tab: createMemoryStorage(),
          shared: createMemoryStorage({ [checkpointKey('recording-a')]: validCheckpoint }),
        }),
      ],
      [
        'a malformed pointer',
        () => ({
          tab: createMemoryStorage({ [pointerKey]: '{"recordingId":42}' }),
          shared: createMemoryStorage({ [checkpointKey('recording-a')]: validCheckpoint }),
        }),
      ],
      [
        'a pointer to a missing checkpoint',
        () => ({
          tab: createMemoryStorage({ [pointerKey]: JSON.stringify({ recordingId: 'recording-a' }) }),
          shared: createMemoryStorage(),
        }),
      ],
      [
        'a malformed checkpoint',
        () => ({
          tab: createMemoryStorage({ [pointerKey]: JSON.stringify({ recordingId: 'recording-a' }) }),
          shared: createMemoryStorage({
            [checkpointKey('recording-a')]: '{"sessionId":"session-a","handoff":"clean"}',
          }),
        }),
      ],
      [
        'a checkpoint without updatedAt',
        () => ({
          tab: createMemoryStorage({ [pointerKey]: JSON.stringify({ recordingId: 'recording-a' }) }),
          shared: createMemoryStorage({
            [checkpointKey('recording-a')]: JSON.stringify({ ...JSON.parse(validCheckpoint), updatedAt: undefined }),
          }),
        }),
      ],
      [
        'a checkpoint of another session',
        () => ({
          tab: createMemoryStorage({ [pointerKey]: JSON.stringify({ recordingId: 'recording-a' }) }),
          shared: createMemoryStorage({
            [checkpointKey('recording-a')]: JSON.stringify({ ...JSON.parse(validCheckpoint), sessionId: 'session-b' }),
          }),
        }),
      ],
      [
        'unreadable shared storage',
        () => ({
          tab: createMemoryStorage({ [pointerKey]: JSON.stringify({ recordingId: 'recording-a' }) }),
          shared: {
            ...createMemoryStorage(),
            getItem: () => {
              throw new DOMException('Storage is not readable', 'SecurityError');
            },
          } as Storage,
        }),
      ],
      [
        'unwritable shared storage',
        () => ({
          tab: createMemoryStorage({ [pointerKey]: JSON.stringify({ recordingId: 'recording-a' }) }),
          shared: {
            ...createMemoryStorage(),
            getItem: () => validCheckpoint,
            setItem: () => {
              throw new DOMException('Storage is not writable', 'SecurityError');
            },
          } as Storage,
        }),
      ],
      [
        'no tab storage',
        () => ({ tab: undefined, shared: createMemoryStorage({ [checkpointKey('recording-a')]: validCheckpoint }) }),
      ],
      [
        'no shared storage',
        () => ({
          tab: createMemoryStorage({ [pointerKey]: JSON.stringify({ recordingId: 'recording-a' }) }),
          shared: undefined,
        }),
      ],
    ])('mints a recovery recording for %s', (_scenario, setup) => {
      const { tab, shared } = setup();
      expect(makeStore(tab, shared, 'new-document', 'recovery').claim('session-a')).toEqual({
        sessionId: 'session-a',
        recordingId: 'recovery',
        nextSeq: 0,
        gen: -1,
      });
    });

    it('does not adopt a legacy checkpoint and removes it', () => {
      const legacyKey = `${legacyReplayRecordingStorageKeyPrefix}${owner}`;
      const tab = createMemoryStorage({
        [legacyKey]: JSON.stringify({
          sessionId: 'session-a',
          recordingId: 'legacy-recording',
          nextSeq: 42,
          gen: 3,
          handoff: 'clean',
          documentId: 'old-document',
        }),
        'unrelated-key': 'kept',
      });
      const store = makeStore(tab, createMemoryStorage(), 'doc-1', 'recovery');
      store.removeLegacyState();

      expect(tab.getItem(legacyKey)).toBeNull();
      expect(tab.getItem('unrelated-key')).toBe('kept');
      expect(store.claim('session-a').recordingId).toBe('recovery');
    });
  });

  describe('pruning', () => {
    function seedCheckpoints(shared: Storage, count: number, at: (index: number) => number) {
      for (let index = 0; index < count; index++) {
        makeStore(createMemoryStorage(), shared, `doc-${index}`, `recording-${index}`, () => at(index)).claim(
          'session-a'
        );
      }
    }

    it('removes checkpoints older than the age bound but never the claiming tab entry', () => {
      const shared = createMemoryStorage();
      const base = 1_000_000;
      seedCheckpoints(shared, 3, () => base);
      const tab = createMemoryStorage();
      const dormant = makeStore(tab, shared, 'doc-old', 'recording-old', () => base);
      expect(dormant.seal({ ...dormant.claim('session-a'), nextSeq: 9, gen: 1 })).toBe(true);

      const later = base + MAX_RECORDING_CHECKPOINT_AGE_MS + 1;
      const claim = makeStore(tab, shared, 'doc-new', 'unused', () => later).claim('session-a');

      expect(claim).toEqual(expect.objectContaining({ recordingId: 'recording-old', nextSeq: 9 }));
      expect(checkpointKeys(shared)).toEqual([checkpointKey('recording-old')]);
    });

    it.each([5_000, 500])('keeps the claiming entry and newest active checkpoints when claimed at %i', (now) => {
      const shared = createMemoryStorage();
      const total = MAX_RETAINED_RECORDING_CHECKPOINTS + 5;
      seedCheckpoints(shared, total, (index) => 1_000 + index);

      const claim = makeStore(createMemoryStorage(), shared, 'doc-new', 'recording-new', () => now).claim('session-a');

      expect(claim.recordingId).toBe('recording-new');
      const keys = checkpointKeys(shared);
      expect(keys).toHaveLength(MAX_RETAINED_RECORDING_CHECKPOINTS);
      expect(keys).toContain(checkpointKey('recording-new'));
      for (let index = 0; index < total; index++) {
        expect(keys.includes(checkpointKey(`recording-${index}`))).toBe(
          index >= total - (MAX_RETAINED_RECORDING_CHECKPOINTS - 1)
        );
      }
    });

    it('preserves navigation continuity while other tabs repeatedly record and close', () => {
      const tab = createMemoryStorage();
      const shared = createMemoryStorage();
      let now = 1_000;
      const active = makeStore(tab, shared, 'doc-active', 'recording-active', () => now);
      const state = active.claim('session-a');
      const total = MAX_RETAINED_RECORDING_CHECKPOINTS + 5;

      for (let index = 0; index < total; index++) {
        now++;
        const other = makeStore(createMemoryStorage(), shared, `doc-${index}`, `recording-${index}`, () => now);
        expect(other.seal(other.claim('session-a'))).toBe(true);
        expect(checkpointKeys(shared)).toHaveLength(Math.min(index + 2, MAX_RETAINED_RECORDING_CHECKPOINTS));
      }

      const keys = checkpointKeys(shared);
      expect(keys).toContain(checkpointKey('recording-active'));
      for (let index = 0; index < total; index++) {
        expect(keys.includes(checkpointKey(`recording-${index}`))).toBe(
          index >= total - (MAX_RETAINED_RECORDING_CHECKPOINTS - 1)
        );
      }

      now++;
      const finalState = { ...state, nextSeq: 42, gen: 3 };
      expect(active.seal(finalState)).toBe(true);
      const nextPage = makeStore(tab, shared, 'doc-next', 'recovery', () => now + 1);
      expect(nextPage.claim('session-a')).toEqual(finalState);
    });

    it('evicts clean checkpoints oldest first before falling back to the oldest active checkpoint', () => {
      const shared = createMemoryStorage();
      const activeCount = MAX_RETAINED_RECORDING_CHECKPOINTS - 2;
      seedCheckpoints(shared, activeCount, (index) => 1_000 + index);
      for (let index = 0; index < 2; index++) {
        const clean = makeStore(
          createMemoryStorage(),
          shared,
          `doc-clean-${index}`,
          `clean-${index}`,
          () => 2_000 + index
        );
        expect(clean.seal(clean.claim('session-a'))).toBe(true);
      }

      for (let index = 0; index < 3; index++) {
        makeStore(createMemoryStorage(), shared, `doc-new-${index}`, `new-${index}`, () => 3_000 + index).claim(
          'session-a'
        );

        const keys = checkpointKeys(shared);
        expect(keys).toHaveLength(MAX_RETAINED_RECORDING_CHECKPOINTS);
        expect(keys).not.toContain(checkpointKey('clean-0'));
        expect(keys.includes(checkpointKey('clean-1'))).toBe(index === 0);
        expect(keys.includes(checkpointKey('recording-0'))).toBe(index < 2);
        for (let activeIndex = 1; activeIndex < activeCount; activeIndex++) {
          expect(keys).toContain(checkpointKey(`recording-${activeIndex}`));
        }
        for (let newIndex = 0; newIndex <= index; newIndex++) {
          expect(keys).toContain(checkpointKey(`new-${newIndex}`));
        }
      }
    });

    it('removes malformed entries under the owner prefix and leaves other keys alone', () => {
      const shared = createMemoryStorage({
        [checkpointKey('broken')]: 'not json',
        [`${replayRecordingCheckpointKeyPrefix}["other-owner"]:recording`]: 'not json',
        'com.grafana.faro.session': 'kept',
      });

      makeStore(createMemoryStorage(), shared, 'doc-1', 'recording-a', () => 1_000).claim('session-a');

      expect(shared.getItem(checkpointKey('broken'))).toBeNull();
      expect(shared.getItem(`${replayRecordingCheckpointKeyPrefix}["other-owner"]:recording`)).toBe('not json');
      expect(shared.getItem('com.grafana.faro.session')).toBe('kept');
    });

    it('makes a pruned dormant tab recover instead of continuing', () => {
      const shared = createMemoryStorage();
      const base = 1_000_000;
      const tab = createMemoryStorage();
      const dormant = makeStore(tab, shared, 'doc-old', 'recording-old', () => base);
      expect(dormant.seal({ ...dormant.claim('session-a'), nextSeq: 9, gen: 1 })).toBe(true);

      const later = base + MAX_RECORDING_CHECKPOINT_AGE_MS + 1;
      makeStore(createMemoryStorage(), shared, 'doc-other', 'recording-other', () => later).claim('session-a');
      expect(shared.getItem(checkpointKey('recording-old'))).toBeNull();

      expect(makeStore(tab, shared, 'doc-new', 'recovery', () => later + 1).claim('session-a').recordingId).toBe(
        'recovery'
      );
    });
  });
});
