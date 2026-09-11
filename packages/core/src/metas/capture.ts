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
export function captureMetas(metas: Pick<Metas, 'capture' | 'value'>, callback?: () => void): Meta {
  if (metas.capture) {
    const meta = metas.capture(callback);
    return isMetaCaptured(meta) ? meta : markMetaCaptured({ ...meta });
  }

  const meta = markMetaCaptured({ ...metas.value });
  callback?.();
  return meta;
}
