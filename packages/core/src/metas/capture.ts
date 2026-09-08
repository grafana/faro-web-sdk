import type { Meta, Metas } from './types';

const capturedMetas = new WeakSet<Meta>();

export function markMetaCaptured(meta: Meta): Meta {
  capturedMetas.add(meta);
  return meta;
}

export function isMetaCaptured(meta: Meta): boolean {
  return capturedMetas.has(meta);
}

/** Capture metadata, including with extension implementations predating capture listeners. */
export function captureMetas(metas: Metas, callback?: () => void): Meta {
  if (metas.capture) {
    return markMetaCaptured(metas.capture(callback));
  }

  const meta = markMetaCaptured(metas.value);
  callback?.();
  return meta;
}
