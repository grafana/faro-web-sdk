export function djb2aHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

export function hashErrorSignature(signature: string): number {
  return djb2aHash(signature);
}
