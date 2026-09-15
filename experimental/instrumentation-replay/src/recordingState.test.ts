import {
  type DocumentRecordingState,
  type RecordingLease,
  recordingLockName,
  ReplayRecordingStateStore,
  replayRecordingStorageKeyPrefix,
  type TabRecordingState,
} from './recordingState';

const namespace = '["faro","app","","production"]';
const key = `${replayRecordingStorageKeyPrefix}${namespace}`;
const checkpoint: TabRecordingState = {
  sessionId: 'A',
  recordingId: 'R',
  nextSeq: 10,
  gen: 2,
  documentId: 'previous',
  handoff: 'clean',
};

function storage(initial: Record<string, string> = {}): Storage {
  const entries = new Map(Object.entries(initial));
  return {
    get length() {
      return entries.size;
    },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
    clear: () => entries.clear(),
  };
}

function store(tab: Storage | undefined, documentId: string, documentState: DocumentRecordingState = {}) {
  let sequence = 0;
  return new ReplayRecordingStateStore({
    storage: tab,
    ownerNamespace: namespace,
    documentId,
    documentState,
    generateRecordingId: () => `${documentId}-${++sequence}`,
  });
}

const acquire = (owner: ReplayRecordingStateStore, signal = new AbortController().signal) =>
  owner.acquire('A', signal, () => 'A');

async function release(lease: RecordingLease | undefined) {
  lease?.release();
  await lease?.released;
}

it('writes counters at lease boundaries and continues the completed checkpoint in another document', async () => {
  const tab = storage({ [key]: JSON.stringify(checkpoint) });
  const write = jest.spyOn(tab, 'setItem');
  const lease = (await acquire(store(tab, 'next')))!;
  expect(JSON.parse(tab.getItem(key)!)).toEqual({ ...checkpoint, documentId: 'next', handoff: 'active' });
  expect(lease.reserve(true)).toEqual({ recordingId: 'R', seq: 10, gen: 3 });
  expect(lease.reserve(false)).toEqual({ recordingId: 'R', seq: 11, gen: 3 });
  expect(write).toHaveBeenCalledTimes(1);
  await release(lease);
  lease.release();
  expect(write).toHaveBeenCalledTimes(2);
  expect(JSON.parse(tab.getItem(key)!)).toEqual({ ...checkpoint, documentId: 'next', nextSeq: 12, gen: 3 });
  expect(lease.reserve(false)).toBeUndefined();

  const next = (await acquire(store(tab, 'restored')))!;
  expect(next.reserve(true)).toEqual({ recordingId: 'R', seq: 12, gen: 4 });
  await release(next);
});

it('waits for the source lease, rereads its completed counters, and never holds two recording locks', async () => {
  const tab = storage({ [key]: JSON.stringify(checkpoint) });
  const source = (await acquire(store(tab, 'source')))!;
  const waiting = acquire(store(tab, 'target'));
  await Promise.resolve();
  expect((await navigator.locks.query()).held).toEqual([
    { name: recordingLockName(namespace, 'R'), mode: 'exclusive' },
  ]);
  expect(source.reserve(true)).toEqual({ recordingId: 'R', seq: 10, gen: 3 });
  await release(source);
  const target = (await waiting)!;
  expect(target.reserve(true)).toEqual({ recordingId: 'R', seq: 11, gen: 4 });
  await release(target);
});

it('keeps an active copied checkpoint waiting, then starts a fresh recording after the source releases', async () => {
  const tab = storage({ [key]: JSON.stringify(checkpoint) });
  const source = (await acquire(store(tab, 'source')))!;
  const copy = storage({ [key]: tab.getItem(key)! });
  let granted = false;
  const waiting = acquire(store(copy, 'copy')).then((lease) => {
    granted = true;
    return lease;
  });
  await Promise.resolve();
  expect(granted).toBe(false);
  await release(source);
  const copied = (await waiting)!;
  expect(copied.reserve(true)).toEqual({ recordingId: 'copy-1', seq: 0, gen: 0 });
  expect((await navigator.locks.query()).held).toEqual([
    { name: recordingLockName(namespace, 'copy-1'), mode: 'exclusive' },
  ]);
  await release(copied);
});

it('documents the accepted collision from independently copied stale clean state', async () => {
  const tab = storage({ [key]: JSON.stringify(checkpoint) });
  const copy = storage({ [key]: tab.getItem(key)! });
  const source = (await acquire(store(tab, 'source')))!;
  const original = source.reserve(true);
  await release(source);
  const copied = (await acquire(store(copy, 'copy')))!;
  expect(original).toEqual({ recordingId: 'R', seq: 10, gen: 3 });
  expect(copied.reserve(true)).toEqual(original);
  await release(copied);
});

it('cancels a queued acquisition without publishing or replacing the source checkpoint', async () => {
  const tab = storage({ [key]: JSON.stringify(checkpoint) });
  const source = (await acquire(store(tab, 'source')))!;
  const controller = new AbortController();
  const waiting = acquire(store(tab, 'target'), controller.signal);
  controller.abort();
  expect(await waiting).toBeUndefined();
  expect(JSON.parse(tab.getItem(key)!).documentId).toBe('source');
  await release(source);
});

it('releases an obsolete grant when its session changes at the grant boundary', async () => {
  const tab = storage({ [key]: JSON.stringify(checkpoint) });
  const owner = store(tab, 'next');
  const lease = await owner.acquire('A', new AbortController().signal, () => 'B');
  expect(lease).toBeUndefined();
  expect(tab.getItem(key)).toBe(JSON.stringify(checkpoint));
  expect((await navigator.locks.query()).held).toEqual([]);
});

it('releases the old lock before adopting a different current recording after grant', async () => {
  const tab = storage({ [key]: JSON.stringify(checkpoint) });
  let unblock!: () => void;
  const blocker = navigator.locks.request(
    recordingLockName(namespace, 'R'),
    () =>
      new Promise<void>((resolve) => {
        unblock = resolve;
      })
  );
  await Promise.resolve();
  const waiting = acquire(store(tab, 'next'));
  tab.setItem(key, JSON.stringify({ ...checkpoint, recordingId: 'replacement', nextSeq: 20 }));
  unblock();
  await blocker;
  const lease = (await waiting)!;
  expect(lease.reserve(true)).toEqual({ recordingId: 'replacement', seq: 20, gen: 3 });
  expect((await navigator.locks.query()).held).toEqual([
    { name: recordingLockName(namespace, 'replacement'), mode: 'exclusive' },
  ]);
  await release(lease);
});

it.each([
  null,
  '{',
  '{}',
  JSON.stringify({ ...checkpoint, sessionId: 'other' }),
  JSON.stringify({ ...checkpoint, handoff: 'active' }),
  JSON.stringify({ ...checkpoint, nextSeq: -1 }),
  JSON.stringify({ ...checkpoint, nextSeq: Number.MAX_SAFE_INTEGER }),
])('recovers unusable continuation state under a fresh locked identity: %s', async (value) => {
  const tab = storage(value === null ? {} : { [key]: value });
  const lease = (await acquire(store(tab, 'fresh')))!;
  expect(lease.reserve(true)).toEqual({ recordingId: 'fresh-1', seq: 0, gen: 0 });
  await release(lease);
});

it('does not overwrite a superseding document or admit a stale lease reservation', async () => {
  const tab = storage({ [key]: JSON.stringify(checkpoint) });
  const lease = (await acquire(store(tab, 'first')))!;
  const replacement = JSON.stringify({ ...checkpoint, recordingId: 'replacement', documentId: 'other' });
  tab.setItem(key, replacement);
  expect(lease.ownership()).toBe('superseded');
  expect(lease.reserve(true)).toBeUndefined();
  await release(lease);
  expect(tab.getItem(key)).toBe(replacement);
});

it('splits before publishing when an existing clean identity cannot receive its active marker', async () => {
  const tab = storage({ [key]: JSON.stringify(checkpoint) });
  const memory: DocumentRecordingState = {};
  jest.spyOn(tab, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  const lease = (await acquire(store(tab, 'document', memory)))!;
  expect(lease.reserve(true)).toEqual({ recordingId: 'document-1', seq: 0, gen: 0 });
  expect(tab.getItem(key)).toBe(JSON.stringify(checkpoint));
  await release(lease);

  const replacement = (await acquire(store(tab, 'document', memory)))!;
  expect(replacement.reserve(true)).toEqual({ recordingId: 'document-1', seq: 1, gen: 1 });
  await release(replacement);
});

it('retains known counters after failed final persistence while another document splits', async () => {
  const tab = storage({ [key]: JSON.stringify(checkpoint) });
  const memory: DocumentRecordingState = {};
  const lease = (await acquire(store(tab, 'document', memory)))!;
  lease.reserve(true);
  const write = jest.spyOn(tab, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  await release(lease);
  expect(JSON.parse(tab.getItem(key)!)).toMatchObject({ handoff: 'active', nextSeq: 10, gen: 2 });

  const replacement = (await acquire(store(tab, 'document', memory)))!;
  expect(replacement.reserve(true)).toEqual({ recordingId: 'R', seq: 11, gen: 4 });
  await release(replacement);
  write.mockRestore();
  const next = (await acquire(store(tab, 'another')))!;
  expect(next.reserve(true)).toEqual({ recordingId: 'another-1', seq: 0, gen: 0 });
  await release(next);
});

it('uses the same native lease protocol for document-local replacement without storage', async () => {
  const memory: DocumentRecordingState = {};
  const lease = (await acquire(store(undefined, 'document', memory)))!;
  lease.reserve(true);
  await release(lease);
  const replacement = (await acquire(store(undefined, 'document', memory)))!;
  expect(replacement.reserve(true)).toEqual({ recordingId: 'document-1', seq: 1, gen: 1 });
  await release(replacement);
  const next = (await acquire(store(undefined, 'another')))!;
  expect(next.reserve(true)).toEqual({ recordingId: 'another-1', seq: 0, gen: 0 });
  await release(next);
});
